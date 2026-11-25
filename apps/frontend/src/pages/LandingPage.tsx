import { Link } from 'react-router-dom';
import {
  Database,
  Sparkles,
  Network,
  Code2,
  GitBranch,
  ShieldCheck,
  ArrowRight,
  Layers,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/primitives';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Database className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              SchemaPilot <span className="text-blue-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/templates" className="hidden sm:inline text-sm text-zinc-300 hover:text-white px-3 py-1.5">
              Templates
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-20 pb-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-300 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          Powered by Google Gemini • MySQL, PostgreSQL, SQL Server, SQLite & MongoDB
        </div>
        <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent max-w-4xl mx-auto leading-tight">
          Design Production Database Schemas in Seconds with AI
        </h1>
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
          Describe your application in plain English. SchemaPilot AI generates normalized tables,
          interactive ER diagrams, multi-engine SQL DDL, migrations, performance audits, and
          documentation.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link to="/register">
            <Button size="lg">
              Launch Schema Studio <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/er-diagram">
            <Button variant="outline" size="lg">
              Try Interactive ER Designer
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: 'AI Schema Architect',
            desc: 'Convert natural language prompts into 3NF/BCNF schemas with indexes, constraints, soft deletes, and audit trails.',
          },
          {
            icon: Network,
            title: 'Interactive ER Diagrams',
            desc: 'Visual React Flow canvas with compact nodes, drag-and-drop connections, undo/redo, minimap, and PNG/SVG/PDF export.',
          },
          {
            icon: Code2,
            title: '5-Engine SQL & NoSQL',
            desc: 'Instant dependency-ordered DDL for MySQL 8, PostgreSQL, SQL Server, SQLite, and MongoDB $jsonSchema validators.',
          },
          {
            icon: GitBranch,
            title: 'Diffs & Migrations',
            desc: 'Compare schema versions visually, detect destructive changes, and generate rollback-safe Up/Down migrations.',
          },
          {
            icon: Zap,
            title: 'Performance Analyzer',
            desc: 'Catch unindexed foreign keys, redundant indexes, wide columns, and partitioning opportunities before production.',
          },
          {
            icon: Layers,
            title: '15 Industry Templates',
            desc: 'Start from battle-tested blueprints for E-Commerce, Banking, Hospital, LMS, SaaS Billing, CRM, and more.',
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-emerald-500/40 transition-colors"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </section>

      <footer className="border-t border-zinc-800/80 py-8 text-center text-xs text-zinc-500 px-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>SOC2-ready security patterns • Never auto-executes AI-generated SQL</span>
        </div>
        © {new Date().getFullYear()} SchemaPilot AI. All rights reserved.
      </footer>
    </div>
  );
}
