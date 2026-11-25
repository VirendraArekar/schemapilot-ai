# SchemaPilot AI — Architecture Overview

## Monorepo Layout
- `packages/shared-types`: Database-agnostic canonical schema model (`CanonicalSchema`) and API contracts.
- `packages/schema-core`: Topological dependency sorting (`sortTablesByDependency`), auto-layout, and schema diff engine (`compareSchemas`).
- `packages/schema-validators`: Structural & normalization validator (`validateSchema`).
- `packages/sql-generators`: Multi-engine DDL/NoSQL generators for MySQL 8, PostgreSQL, SQL Server, SQLite, and MongoDB, plus Up/Down migration SQL generation.
- `apps/backend`: Modular NestJS REST & WebSocket API backed by Prisma ORM and MySQL 8.
- `apps/frontend`: React + TypeScript + Vite + Tailwind CSS v4 + React Flow + Monaco Editor + Redux Toolkit + TanStack Query.

## Security Model
- HTTP-only `access_token` & `refresh_token` cookies with refresh token rotation stored as SHA-256 hashes in `user_sessions`.
- Workspace-level isolation enforced by `WorkspacesService.assertMembership`.
- AI-generated SQL and uploaded DDL files are never auto-executed.
- Destructive migrations require explicit `confirmDestructive: true`.
