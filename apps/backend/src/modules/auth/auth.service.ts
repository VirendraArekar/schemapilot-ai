import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { generateSecureToken, sha256 } from '../../common/utils/crypto.util';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = generateSecureToken(24);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          emailVerificationToken: sha256(verificationToken),
          isEmailVerified: false,
        },
      });

      const slugBase = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';
      const workspace = await tx.workspace.create({
        data: {
          name: `${dto.name}'s Workspace`,
          slug: `${slugBase}-${created.id.slice(0, 6)}`,
          ownerId: created.id,
          members: {
            create: {
              userId: created.id,
              role: 'OWNER',
              joinedAt: new Date(),
            },
          },
          subscription: {
            create: {
              plan: 'FREE',
              monthlyAiQuota: 100,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workspaceId: workspace.id,
          userId: created.id,
          action: 'USER_REGISTERED',
          entityType: 'USER',
          entityId: created.id,
        },
      });

      return created;
    });

    const tokens = await this.issueTokens(user.id, user.email, user.globalRole, userAgent, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
      verificationTokenPreview:
        this.configService.get('nodeEnv') === 'development' ? verificationToken : undefined,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.globalRole, userAgent, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        globalRole: user.globalRole,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async issueTokens(
    userId: string,
    email: string,
    globalRole: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const payload = { sub: userId, email, globalRole };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn') || '15m',
    });

    const rawRefresh = generateSecureToken(48);
    const refreshHash = sha256(rawRefresh);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken: refreshHash,
        userAgent: userAgent?.slice(0, 250),
        ipAddress: ipAddress?.slice(0, 64),
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  async refreshTokens(rawRefreshToken: string, userAgent?: string, ipAddress?: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const hash = sha256(rawRefreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: { refreshToken: hash, revokedAt: null },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Rotate refresh token: revoke old session and issue new pair
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      session.user.id,
      session.user.email,
      session.user.globalRole,
      userAgent,
      ipAddress,
    );

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        globalRole: session.user.globalRole,
      },
      ...tokens,
    };
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      await this.prisma.userSession.updateMany({
        where: { refreshToken: sha256(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { loggedOut: true };
  }

  async verifyEmail(token: string) {
    const hashed = sha256(token);
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: hashed, deletedAt: null },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });
    return { verified: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user) {
      return { message: 'If an account exists, a password reset link has been sent.' };
    }
    const rawToken = generateSecureToken(24);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: sha256(rawToken),
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return {
      message: 'If an account exists, a password reset link has been sent.',
      resetTokenPreview:
        this.configService.get('nodeEnv') === 'development' ? rawToken : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashed = sha256(dto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashed,
        resetPasswordExpires: { gt: new Date() },
        deletedAt: null,
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { reset: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Password change is not available for this account');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { changed: true };
  }

  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async handleGoogleOAuth(googleUser: {
    googleId: string;
    email?: string;
    name: string;
    avatarUrl?: string;
  }) {
    if (!googleUser.email) {
      throw new BadRequestException('Google account did not return an email address');
    }
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleUser.googleId }, { email: googleUser.email.toLowerCase() }],
      },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          googleId: googleUser.googleId,
          isEmailVerified: true,
        },
      });
    }
    return this.issueTokens(user.id, user.email, user.globalRole);
  }
}
