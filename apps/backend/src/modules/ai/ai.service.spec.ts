import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../../database/prisma.service';
import { GeminiProvider } from './gemini.provider';
import { CanonicalSchema } from '@schemapilot/shared-types';

describe('AiService', () => {
  let service: AiService;
  const mockGemini = { complete: jest.fn() };
  const mockPrisma = {
    aiUsage: { create: jest.fn() },
    aiConversation: { create: jest.fn() },
    aiMessage: { createMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiProvider, useValue: mockGemini },
      ],
    }).compile();
    service = moduleRef.get(AiService);
  });

  it('analyzes schema performance and flags unindexed FKs', () => {
    const schema: CanonicalSchema = {
      name: 'Test',
      engine: 'POSTGRESQL',
      tables: [
        {
          id: 't1',
          name: 'audit_logs',
          position: { x: 0, y: 0 },
          columns: [
            { id: 'c1', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
            { id: 'c2', name: 'user_id', dataType: 'UUID', isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false },
            { id: 'c3', name: 'created_at', dataType: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
          ],
          indexes: [],
          constraints: [],
        },
      ],
      relationships: [],
    };
    const issues = service.analyzePerformance(schema);
    expect(issues.some((i) => i.category === 'FOREIGN_KEY')).toBe(true);
    expect(issues.some((i) => i.category === 'PARTITIONING')).toBe(true);
  });

  it('generates and validates structured schema from Gemini response', async () => {
    mockGemini.complete.mockResolvedValue({
      text: JSON.stringify({
        name: 'BlogDB',
        engine: 'POSTGRESQL',
        tables: [
          {
            id: 't1',
            name: 'users',
            position: { x: 0, y: 0 },
            columns: [
              { id: 'c1', name: 'id', dataType: 'UUID', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true },
            ],
            indexes: [],
            constraints: [],
          },
        ],
        relationships: [],
      }),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      latencyMs: 500,
    });

    const result = await service.generateSchema('user-1', {
      prompt: 'Create a blog database',
      engine: 'POSTGRESQL',
    });

    expect(result.schema.name).toBe('BlogDB');
    expect(result.validation.isValid).toBe(true);
    expect(mockPrisma.aiUsage.create).toHaveBeenCalledTimes(1);
  });
});
