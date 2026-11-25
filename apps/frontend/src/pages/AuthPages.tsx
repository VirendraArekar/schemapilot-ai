import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Database } from 'lucide-react';
import { api, extractData } from '../services/api';
import { useAppDispatch } from '../store';
import { setCredentials } from '../store/authSlice';
import { addToast } from '../store/uiSlice';
import { Button, Card, Input } from '../components/ui/primitives';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setError('');
    try {
      const res = extractData<{ user: any; accessToken: string }>(
        await api.post('/auth/login', values),
      );
      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
      dispatch(addToast({ title: 'Welcome back!', variant: 'success' }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Check credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Sign in to SchemaPilot AI</h1>
            <p className="text-xs text-slate-400">Access your database architecture studio</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Email</label>
            <Input {...register('email')} type="email" placeholder="demo@schemapilot.ai" className="mt-1" />
            {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex justify-between">
              <label className="text-xs font-medium text-slate-400">Password</label>
              <Link to="/forgot-password" className="text-xs text-indigo-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input {...register('password')} type="password" placeholder="••••••••" className="mt-1" />
            {errors.password && (
              <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setValue('email', 'demo@schemapilot.ai');
              setValue('password', 'DemoPass123!');
            }}
          >
            Fill Demo Account Credentials
          </Button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:underline font-medium">
            Create one
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setError('');
    try {
      const res = extractData<{ user: any; accessToken: string }>(
        await api.post('/auth/register', values),
      );
      dispatch(setCredentials({ user: res.user, accessToken: res.accessToken }));
      dispatch(addToast({ title: 'Workspace created!', variant: 'success' }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-1">Create your account</h1>
        <p className="text-xs text-slate-400 mb-6">Start designing schemas with AI in seconds</p>
        {error && (
          <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Full Name</label>
            <Input {...register('name')} placeholder="Alex Rivera" className="mt-1" />
            {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Email</label>
            <Input {...register('email')} type="email" placeholder="alex@company.com" className="mt-1" />
            {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Password</label>
            <Input {...register('password')} type="password" placeholder="Min 8 characters" className="mt-1" />
            {errors.password && (
              <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating workspace...' : 'Create Account'}
          </Button>
        </form>
        <div className="mt-5 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (values: z.infer<typeof forgotSchema>) => {
    await api.post('/auth/forgot-password', values);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-2">Reset Password</h1>
        {sent ? (
          <p className="text-sm text-emerald-400 mb-4">
            If an account exists for that email, a password reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input {...register('email')} type="email" placeholder="Enter your email" />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Send Reset Link
            </Button>
          </form>
        )}
        <div className="mt-4 text-center text-xs">
          <Link to="/login" className="text-indigo-400 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
