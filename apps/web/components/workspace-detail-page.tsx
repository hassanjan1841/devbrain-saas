'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';

type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
};

type Memory = {
  id: string;
  content: string;
  createdAt: string;
  tags: string[];
  repoPath?: string | null;
};

type AskResponse = {
  answer: string;
  memories: Array<{ id: string; content: string; tags: string[]; repoPath?: string | null }>;
  codeChunks: Array<{ id: string; path: string; content: string }>;
};

export default function WorkspaceDetailPage({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [query, setQuery] = useState('What did I change recently in this project?');
  const [answer, setAnswer] = useState('');
  const [references, setReferences] = useState<AskResponse['memories']>([]);
  const [codeChunks, setCodeChunks] = useState<AskResponse['codeChunks']>([]);
  const [status, setStatus] = useState('Loading workspace...');

  useEffect(() => {
    const saved = window.localStorage.getItem('devbrain-token');
    if (!saved) {
      router.replace('/');
      return;
    }

    setToken(saved);
    void hydrate(saved);
  }, [router, workspaceId]);

  async function hydrate(activeToken: string) {
    const [workspaceResponse, memoriesResponse] = await Promise.all([
      apiRequest<{ workspace: Workspace }>(`/workspaces/${workspaceId}`, { method: 'GET' }, activeToken),
      apiRequest<{ memories: Memory[] }>(`/memories?workspaceId=${workspaceId}`, { method: 'GET' }, activeToken)
    ]);

    if (!workspaceResponse.success || !workspaceResponse.data) {
      setStatus(workspaceResponse.error?.message ?? 'Failed to load workspace.');
      return;
    }

    setWorkspace(workspaceResponse.data.workspace);

    if (memoriesResponse.success && memoriesResponse.data) {
      setMemories(memoriesResponse.data.memories);
    }

    setStatus('Workspace ready.');
  }

  async function handleAsk() {
    if (!token) {
      return;
    }

    setStatus('Asking DevBrain...');
    const response = await apiRequest<AskResponse>('/ask', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        query
      })
    }, token);

    if (!response.success || !response.data) {
      setStatus(response.error?.message ?? 'Ask failed.');
      return;
    }

    setAnswer(response.data.answer);
    setReferences(response.data.memories);
    setCodeChunks(response.data.codeChunks);
    setStatus('Answer generated.');
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm text-emerald-300 hover:text-emerald-200" href="/workspaces">
            ← Back to workspaces
          </Link>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{workspace?.name ?? 'Workspace'}</h1>
          <p className="mt-2 max-w-2xl text-slate-400">{workspace?.description || 'No description yet.'}</p>
        </div>
        <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-emerald-300">
          {workspace?.slug ?? 'loading'}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Ask DevBrain</h2>
          <p className="mt-2 text-sm text-slate-400">Search across your saved memories and any ingested code chunks for this workspace.</p>
          <textarea
            className="mt-4 min-h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask DevBrain about this project"
          />
          <button
            className="mt-4 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
            onClick={handleAsk}
            disabled={query.trim().length < 2}
          >
            Ask workspace
          </button>
          <p className="mt-4 text-sm text-emerald-300">{status}</p>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
            <h3 className="text-sm font-medium text-white">Answer</h3>
            <pre className="mt-3 text-sm text-slate-300">{answer || 'Your answer will appear here.'}</pre>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="text-sm font-medium text-white">Referenced memories</h3>
              <div className="mt-3 space-y-3">
                {references.length === 0 ? <p className="text-sm text-slate-500">No references yet.</p> : null}
                {references.map((memory) => (
                  <article key={memory.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-200">{memory.content}</p>
                    {memory.tags.length > 0 ? (
                      <p className="mt-2 text-xs text-emerald-300">{memory.tags.join(', ')}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="text-sm font-medium text-white">Referenced code</h3>
              <div className="mt-3 space-y-3">
                {codeChunks.length === 0 ? <p className="text-sm text-slate-500">No code chunks referenced yet.</p> : null}
                {codeChunks.map((chunk) => (
                  <article key={chunk.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{chunk.path}</p>
                    <pre className="mt-2 text-xs text-slate-300">{chunk.content.slice(0, 280)}</pre>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Recent memories</h2>
          <div className="mt-4 space-y-4">
            {memories.length === 0 ? <p className="text-sm text-slate-500">No memories in this workspace yet.</p> : null}
            {memories.map((memory) => (
              <article key={memory.id} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <pre className="text-sm text-slate-200">{memory.content}</pre>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{new Date(memory.createdAt).toLocaleString()}</span>
                  {memory.repoPath ? <span>{memory.repoPath}</span> : null}
                  {memory.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
