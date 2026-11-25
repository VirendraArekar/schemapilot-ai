import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  Network,
  TableProperties,
  Code2,
  Bot,
  Activity,
  GitCompare,
  GitBranch,
  FileText,
  Layers,
  Settings,
  CreditCard,
  ShieldCheck,
  Search,
  Bell,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User as UserIcon,
  Database,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleSidebar, toggleTheme, setSearchModalOpen } from '../store/uiSlice';
import { logoutState, setActiveWorkspace } from '../store/authSlice';
import { api, extractData } from '../services/api';
import { Modal } from '../components/ui/primitives';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/templates', label: 'Templates', icon: Layers },
    ],
  },
  {
    label: 'Design Studio',
    items: [
      { to: '/ai-generator', label: 'AI Generator', icon: Sparkles },
      { to: '/er-diagram', label: 'ER Diagram', icon: Network },
      { to: '/schema-editor', label: 'Schema Editor', icon: TableProperties },
      { to: '/sql-editor', label: 'SQL Editor', icon: Code2 },
      { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
      { to: '/import', label: 'Reverse Engineer', icon: Upload },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/analyzer', label: 'Performance', icon: Activity },
      { to: '/compare', label: 'Schema Diff', icon: GitCompare },
      { to: '/migrations', label: 'Migrations', icon: GitBranch },
      { to: '/documentation', label: 'Documentation', icon: FileText },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/workspace', label: 'Workspace', icon: Settings },
      { to: '/settings/profile', label: 'Profile', icon: UserIcon },
      { to: '/settings/billing', label: 'Billing & Usage', icon: CreditCard },
      { to: '/admin', label: 'Admin', icon: ShieldCheck },
    ],
  },
];

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, sidebarCollapsed, searchModalOpen } = useAppSelector((s) => s.ui);
  const { user, activeWorkspaceId } = useAppSelector((s) => s.auth);
  const { activeProjectId, schema } = useAppSelector((s) => s.schema);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => extractData<any[]>(await api.get('/workspaces')),
  });

  useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      dispatch(setActiveWorkspace(workspaces[0].id));
    }
  }, [workspaces, activeWorkspaceId, dispatch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch(setSearchModalOpen(!searchModalOpen));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, searchModalOpen]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    dispatch(logoutState());
    navigate('/login');
  };

  const allNavItems = navGroups.flatMap((g) => g.items);
  const filteredNav = allNavItems.filter((i) =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const SidebarContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Database className="h-4 w-4" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold tracking-tight text-sm whitespace-nowrap">
              SchemaPilot <span className="text-blue-400">AI</span>
            </span>
          )}
        </Link>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="hidden md:inline-flex rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          title="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-500/15 text-blue-500 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                    title={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-2.5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 flex w-64 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-800">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-3 sm:px-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <select
              value={activeWorkspaceId || ''}
              onChange={(e) => dispatch(setActiveWorkspace(e.target.value))}
              className="max-w-[150px] sm:max-w-xs truncate rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium focus:outline-none"
            >
              {workspaces.map((ws: any) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
              {workspaces.length === 0 && <option value="">Personal Workspace</option>}
            </select>

            <button
              onClick={() => dispatch(setSearchModalOpen(true))}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Quick jump...</span>
              <kbd className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => dispatch(toggleTheme())}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Toggle light/dark theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer relative"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xl z-40">
                  <p className="text-xs font-semibold mb-2">Notifications</p>
                  <p className="text-xs text-zinc-500">
                    Welcome to SchemaPilot AI! Your workspace is active.
                  </p>
                </div>
              )}
            </div>

            <Link
              to="/settings/profile"
              className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="hidden md:inline text-xs font-medium">{user?.name || 'Account'}</span>
            </Link>
          </div>
        </header>

        {/* Workflow Stepper Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/50 px-3 sm:px-4 py-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-zinc-500">Active:</span>
            <Link
              to={activeProjectId ? `/projects/${activeProjectId}` : '/projects'}
              className="font-semibold text-blue-400 hover:underline truncate max-w-[160px]"
            >
              {schema.name}
            </Link>
            <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono">
              {schema.engine}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {[
              { to: activeProjectId ? `/projects/${activeProjectId}` : '/projects', label: '1. Project' },
              { to: '/ai-generator', label: '2. AI / Import' },
              { to: '/er-diagram', label: '3. ER Diagram' },
              { to: '/schema-editor', label: '4. Schema' },
              { to: '/sql-editor', label: '5. SQL & Migrations' },
              { to: '/documentation', label: '6. Docs' },
            ].map((step, i) => (
              <React.Fragment key={step.label}>
                {i > 0 && <span className="text-zinc-600">→</span>}
                <NavLink
                  to={step.to}
                  className={({ isActive }) =>
                    `rounded px-2 py-0.5 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  {step.label}
                </NavLink>
              </React.Fragment>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <Modal
        open={searchModalOpen}
        onClose={() => dispatch(setSearchModalOpen(false))}
        title="Quick Navigation (⌘K)"
      >
        <input
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pages, tools, settings..."
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-emerald-500"
        />
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  dispatch(setSearchModalOpen(false));
                  setSearchQuery('');
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-emerald-500/10 hover:text-emerald-400 text-left cursor-pointer"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
