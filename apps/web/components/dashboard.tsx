'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

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
      setStatus(response.error?.message ?? 'Authentication failed.');
      return;
    }

    window.localStorage.setItem('devbrain-token', response.data.token);
    setToken(response.data.token);
    setStatus(`Authenticated as ${response.data.user.email}`);
  }

  function handleLogout() {
    window.localStorage.removeItem('devbrain-token');
    setToken('');
    setStatus('Signed out.');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-8 rounded-[2rem] border border-slate-800/80 bg-slate-950/90 p-8 shadow-2xl lg:grid-cols-[1.2fr,0.8fr]">
        <section className="rounded-[1.75rem] border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(2,6,23,0.98))] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">DevBrain v1</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-white">
            A second brain for the repos you switch between.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Create a workspace, link your repo from the CLI, save implementation notes, and ask the project what you forgot.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">1</p>
              <p className="mt-2 text-sm font-medium text-white">Create a workspace</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">2</p>
              <p className="mt-2 text-sm font-medium text-white">Remember key decisions</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">3</p>
              <p className="mt-2 text-sm font-medium text-white">Ask later, get context fast</p>
            </div>
          </div>

          <p className="mt-8 text-sm text-emerald-300">Status: {status}</p>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-6">
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
              <div className="mb-5 flex gap-2 rounded-2xl bg-slate-950/70 p-1">
                <button
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm ${mode === 'login' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm ${mode === 'signup' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
                  onClick={() => setMode('signup')}
                >
                  Signup
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                />
                <input
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                />
                <button
                  className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950"
                  onClick={handleAuth}
                >
                  {mode === 'login' ? 'Login' : 'Create account'}
                </button>
              </div>
            </>
          )}

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
            CLI flow:
            <pre className="mt-3 text-xs text-slate-300">
              # Local (no global install)
              npm run cli -- login --email demo@devbrain.ai --password password123{'\n'}
              npm run cli -- init{'\n'}
              npm run cli -- remember "Implemented VAT logic in CheckoutService"{'\n'}
              npm run cli -- ask "Where do I calculate VAT?"{'\n'}
              {'\n'}
              # Optional: global devbrain CLI{'\n'}
              npm run build --workspace @devbrain/cli{'\n'}
              npm link --workspace @devbrain/cli{'\n'}
              devbrain login --email demo@devbrain.ai --password password123{'\n'}
              devbrain init
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
