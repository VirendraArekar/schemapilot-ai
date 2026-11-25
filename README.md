# SchemaPilot AI — AI-Powered Database Schema Designer

Production-ready SaaS platform for designing database schemas from natural language using Google Gemini, interactive React Flow ER diagrams, multi-engine SQL/NoSQL generation, reverse engineering, schema comparison, migrations, performance analysis, and team collaboration.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Flow (`@xyflow/react`), Monaco Editor, Redux Toolkit, TanStack Query, React Hook Form, Zod, Recharts, Vitest
- **Backend**: NestJS, TypeScript, Prisma ORM, MySQL 8, Socket.IO, Swagger/OpenAPI, Google Gemini (`@google/genai`), Jest
- **Infrastructure**: Docker, Docker Compose, Redis, RustFS (S3-compatible), Nginx, GitHub Actions

## Local Development
```bash
npm install
npm run build:packages
npm --workspace=@schemapilot/backend run prisma:generate
npm run dev:backend
npm run dev:frontend
```

## Run All Tests
```bash
npm test
```

## One-Command Docker Launch
```bash
cp .env.example .env
# Add your GEMINI_API_KEY in .env
docker compose up --build -d
docker compose exec backend npm --workspace=@schemapilot/backend run prisma:seed
```

Demo Credentials: `demo@schemapilot.ai` / `DemoPass123!`

---

## Screenshots (Light Theme)

### Landing & Authentication
| Landing Page | Login | Register |
| :---: | :---: | :---: |
| ![Landing Page](docs/screenshots/01-landing.png) | ![Login](docs/screenshots/02-login.png) | ![Register](docs/screenshots/03-register.png) |

### Dashboard, Projects & Templates
| Workspace Dashboard | Projects Listing (50+ per page) | ER Diagram Blueprints (100 Templates) |
| :---: | :---: | :---: |
| ![Dashboard](docs/screenshots/04-dashboard.png) | ![Projects](docs/screenshots/05-projects.png) | ![Templates](docs/screenshots/06-templates.png) |

### Design Studio
| AI Schema Generator | Visual ER Diagram Designer | Schema Editor (Columns, Constraints, Indexes) |
| :---: | :---: | :---: |
| ![AI Generator](docs/screenshots/07-ai-generator.png) | ![ER Diagram](docs/screenshots/08-er-diagram.png) | ![Schema Editor](docs/screenshots/09-schema-editor.png) |

| SQL & Script Generator (Monaco Editor) | AI Database Assistant | Reverse Engineering / Import |
| :---: | :---: | :---: |
| ![SQL Editor](docs/screenshots/10-sql-editor.png) | ![AI Assistant](docs/screenshots/11-ai-assistant.png) | ![Reverse Engineer](docs/screenshots/12-reverse-engineer.png) |

### Operations & Governance
| Performance Analyzer | Schema Comparison & Diff | Migration Manager | Documentation Exporter |
| :---: | :---: | :---: | :---: |
| ![Performance Analyzer](docs/screenshots/13-performance-analyzer.png) | ![Schema Comparison](docs/screenshots/14-schema-compare.png) | ![Migrations](docs/screenshots/15-migrations.png) | ![Documentation](docs/screenshots/16-documentation.png) |

### Settings & Admin
| Workspace Settings | User Profile & Sessions | Billing & Usage | Super Admin Dashboard |
| :---: | :---: | :---: | :---: |
| ![Workspace Settings](docs/screenshots/17-workspace-settings.png) | ![Profile Settings](docs/screenshots/18-profile-settings.png) | ![Billing](docs/screenshots/19-billing.png) | ![Admin Dashboard](docs/screenshots/20-admin.png) |
