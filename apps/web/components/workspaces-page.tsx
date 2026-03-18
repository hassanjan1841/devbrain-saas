'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';

type Workspace = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  updatedAt: string;
};

export default function WorkspacesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Loading workspaces...');

  useEffect(() => {
    const saved = window.localStorage.getItem('devbrain-token');
    if (!saved) {
      router.replace('/');
      return;
    }

    setToken(saved);
    void hydrate(saved);
  }, [router]);

  async function hydrate(activeToken: string) {
    const response = await apiRequest<{ workspaces: Workspace[] }>('/workspaces', { method: 'GET' }, activeToken);

    if (!response.success || !response.data) {
      setStatus(response.error?.message ?? 'Failed to load workspaces.');
      return;
    }

    setWorkspaces(response.data.workspaces);
    setStatus(response.data.workspaces.length === 0 ? 'No workspaces yet.' : 'Workspace list ready.');
  }

  async function handleCreateWorkspace() {
    if (!token) {
      return;
    }

    setStatus('Creating workspace...');
    const response = await apiRequest<{ workspace: Workspace }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description || undefined
      })
    }, token);

    if (!response.success || !response.data) {
      setStatus(response.error?.message ?? 'Failed to create workspace.');
      return;
    }

    setName('');
    setDescription('');
    setStatus(`Created "${response.data.workspace.name}".`);
    await hydrate(token);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Workspaces</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Your linked project brains</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Create a workspace once, then point any local repo at it with `devbrain init`.</p>
        </div>
        <Link className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:border-emerald-400 hover:text-white" href="/">
          Back to auth
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">New workspace</h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Travel SaaS"
            />
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description of the codebase or product"
            />
            <button
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
              onClick={handleCreateWorkspace}
              disabled={name.trim().length < 2}
            >
              Create workspace
            </button>
          </div>
          <p className="mt-4 text-sm text-emerald-300">{status}</p>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Workspace list</h2>
          <div className="mt-4 space-y-4">
            {workspaces.length === 0 ? <p className="text-sm text-slate-500">No workspaces yet.</p> : null}
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                className="block rounded-3xl border border-slate-800 bg-slate-950/80 p-5 transition hover:border-emerald-400/60"
                href={`/workspaces/${workspace.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">{workspace.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{workspace.description || 'No description yet.'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
                    {workspace.slug}
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-500">Updated {new Date(workspace.updatedAt).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
