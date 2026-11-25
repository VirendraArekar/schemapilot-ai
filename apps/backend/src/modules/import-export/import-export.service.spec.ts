import { Test } from '@nestjs/testing';
import { ImportExportService } from './import-export.service';

describe('ImportExportService', () => {
  let service: ImportExportService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ImportExportService],
    }).compile();
    service = moduleRef.get(ImportExportService);
  });

  it('parses SQL DDL into a CanonicalSchema with relationships', () => {
    const sql = `
      CREATE TABLE users (
        id CHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE
      );
      CREATE TABLE orders (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `;
    const result = service.importSchema('SQL_DDL', sql, 'MYSQL');
    expect(result.schema.tables).toHaveLength(2);
    expect(result.schema.relationships).toHaveLength(1);
    expect(result.schema.relationships[0].targetTable).toBe('users');
  });

  it('parses Prisma schema models and relations', () => {
    const prisma = `
      model User {
        id String @id @default(uuid())
        email String @unique
        posts Post[]
      }
      model Post {
        id Int @id @default(autoincrement())
        authorId String
        author User @relation(fields: [authorId], references: [id])
      }
    `;
    const result = service.importSchema('PRISMA', prisma);
    expect(result.schema.tables).toHaveLength(2);
    expect(result.schema.relationships).toHaveLength(1);
  });

  it('generates Markdown and HTML documentation', () => {
    const { schema } = service.importSchema(
      'JSON_SCHEMA',
      JSON.stringify({
        title: 'User',
        required: ['id', 'email'],
        properties: { id: { type: 'string' }, email: { type: 'string' } },
      }),
    );
    const md = service.generateDocumentation(schema, 'MARKDOWN');
    expect(md.content).toContain('# User — Database Documentation');
    const html = service.generateDocumentation(schema, 'HTML');
    expect(html.content).toContain('<!DOCTYPE html>');
  });
});
