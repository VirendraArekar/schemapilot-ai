import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './store';
import { setCredentials } from './store/authSlice';
import { api, extractData } from './services/api';
import { AppLayout } from './layouts/AppLayout';
import { ToastContainer } from './components/ui/ToastContainer';
import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectWorkspacePage } from './pages/ProjectWorkspacePage';
import { AiGeneratorPage } from './pages/AiGeneratorPage';
import { ErDiagramPage } from './pages/ErDiagramPage';
import { SchemaEditorPage } from './pages/SchemaEditorPage';
import { SqlEditorPage } from './pages/SqlEditorPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { ImportPage } from './pages/ImportPage';
import { AnalyzerPage } from './pages/AnalyzerPage';
import { SchemaComparePage } from './pages/SchemaComparePage';
import { MigrationsPage } from './pages/MigrationsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { TemplatesPage } from './pages/TemplatesPage';
import {
  AdminDashboardPage,
  BillingPage,
  ProfileSettingsPage,
  WorkspaceSettingsPage,
} from './pages/SettingsAndAdminPages';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      api
        .get('/auth/me')
        .then((res) => dispatch(setCredentials({ user: extractData(res) })))
        .catch(() => {});
    }
  }, [isAuthenticated, user, dispatch]);

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Studio routes accessible inside AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
          <Route path="/ai-generator" element={<AiGeneratorPage />} />
          <Route path="/schema-editor" element={<SchemaEditorPage />} />
          <Route path="/sql-editor" element={<SqlEditorPage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/analyzer" element={<AnalyzerPage />} />
          <Route path="/compare" element={<SchemaComparePage />} />
          <Route path="/migrations" element={<MigrationsPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
          <Route path="/settings/profile" element={<ProfileSettingsPage />} />
          <Route path="/settings/billing" element={<BillingPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>

        {/* Publicly tryable ER diagram & Templates */}
        <Route element={<AppLayout />}>
          <Route path="/er-diagram" element={<ErDiagramPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthBootstrap>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
