# SchemaPilot AI — Deployment Guide

## Quick Start with Docker Compose
```bash
cp .env.example .env
# Add your GEMINI_API_KEY in .env
docker compose up --build -d
```

- Frontend (Nginx): `http://localhost:8080`
- Backend API: `http://localhost:4000/api/v1`
- Swagger OpenAPI Docs: `http://localhost:4000/api/docs`
- MinIO S3 Console: `http://localhost:9001`

## Seed Demo Data
```bash
npm --workspace=@schemapilot/backend run prisma:seed
```
Demo credentials: `demo@schemapilot.ai` / `DemoPass123!`
