import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId') || 'disabled-client-id',
      clientSecret: configService.get<string>('google.clientSecret') || 'disabled-client-secret',
      callbackURL:
        configService.get<string>('google.callbackUrl') ||
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails?: { value: string }[]; displayName?: string; photos?: { value: string }[] },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const user = {
      googleId: profile.id,
      email,
      name: profile.displayName || email || 'Google User',
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
