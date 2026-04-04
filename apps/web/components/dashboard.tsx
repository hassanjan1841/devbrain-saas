'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import Toast, { type ToastState } from './toast';

type AuthResponse = {
  token: string;
  user: { id: string; email: string };
};

export default function Dashboard() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('demo@devbrain.ai');
  const [password, setPassword] = useState('password123');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Sign in to open your workspaces.');
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('devbrain-token');
    if (saved) {
      setToken(saved);
      setStatus('Authenticated. Open your workspaces.');
    }
  }, []);

  async function handleAuth() {
    setStatus(mode === 'login' ? 'Signing in...' : 'Creating account...');
    const response = await apiRequest<AuthResponse>(`/${mode}`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (!response.success || !response.data) {
      const message = response.error?.message ?? 'Authentication failed.';
      setStatus(message);
      setToast({ kind: 'error', message });
      return;
    }

    window.localStorage.setItem('devbrain-token', response.data.token);
    setToken(response.data.token);
    const message = `Authenticated as ${response.data.user.email}`;
    setStatus(message);
    setToast({ kind: 'success', message });
  }

  function handleLogout() {
    window.localStorage.removeItem('devbrain-token');
    setToken('');
    const message = 'Signed out.';
    setStatus(message);
    setToast({ kind: 'info', message });
  }

  return (
    <>
      <main className="mx-auto flex min-h-screen max-w-5xl items-stretch px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid w-full gap-6 rounded-[2rem] border border-slate-800/80 bg-slate-950/90 p-6 shadow-2xl sm:p-8 lg:grid-cols-[1.2fr,0.9fr]">
          <section className="rounded-[1.75rem] border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300 sm:text-xs">DevBrain v1</p>
            <h1 className="mt-4 max-w-xl text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
              A second brain for the repos you switch between.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Create a workspace, link your repo from the CLI, save implementation notes, and ask the project what you forgot.
            </p>

            <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <p className="text-xs text-slate-400">1</p>
                <p className="mt-1 text-sm font-medium text-white">Create a workspace</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <p className="text-xs text-slate-400">2</p>
                <p className="mt-1 text-sm font-medium text-white">Remember key decisions</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <p className="text-xs text-slate-400">3</p>
                <p className="mt-1 text-sm font-medium text-white">Ask later, get context fast</p>
              </div>
            </div>

            <p className="mt-6 text-xs text-emerald-300 sm:mt-8 sm:text-sm">Status: {status}</p>
          </section>

          <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
            {token ? (
              // Authenticated: only show workspace + logout actions
              <div className="space-y-3">
                <p className="text-sm text-slate-300">You are signed in. Open your workspaces or sign out.</p>
                <Link
                  className="block w-full rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm text-slate-200 transition hover:border-emerald-400 hover:text-white"
                  href="/workspaces"
                >
                  Open workspaces
                </Link>
                <button
                  className="w-full rounded-2xl border border-slate-800 px-4 py-3 text-sm text-slate-300"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              // Not authenticated: show login/signup form
              <>
                <div className="mb-4 flex gap-2 rounded-2xl bg-slate-950/70 p-1">
                  <button
                    className={`flex-1 rounded-2xl px-4 py-2 text-xs sm:text-sm ${mode === 'login' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
                    onClick={() => setMode('login')}
                  >
                    Login
                  </button>
                  <button
                    className={`flex-1 rounded-2xl px-4 py-2 text-xs sm:text-sm ${mode === 'signup' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
                    onClick={() => setMode('signup')}
                  >
                    Signup
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    onClick={handleAuth}
                    disabled={!email || !password}
                  >
                    {mode === 'login' ? 'Login' : 'Create account'}
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400 sm:text-sm">
              CLI flow:
              <pre className="mt-3 whitespace-pre-wrap text-[10px] text-slate-300 sm:text-xs">
                # Local (no global install)
                npm run cli -- login --email demo@devbrain.ai --password password123{'
'}
                npm run cli -- init{'
'}
                npm run cli -- remember "Implemented VAT logic in CheckoutService"{'
'}
                npm run cli -- ask "Where do I calculate VAT?"{'
'}
                {'
'}
                # Optional: global devbrain CLI{'
'}
                npm run build --workspace @devbrain/cli{'
'}
                npm link --workspace @devbrain/cli{'
'}
                devbrain login --email demo@devbrain.ai --password password123{'
'}
                devbrain init
              </pre>
            </div>
          </section>
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
