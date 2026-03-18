import { randomUUID } from 'node:crypto';
import {
  createMemoryRecord,
  findMemoriesByChromaIds,
  queryMemoryVectors,
  upsertMemoryVector
} from '@devbrain/db';
import { generateEmbedding } from './embeddings.js';
import { buildReflection } from './reflection.js';
import { brainEnv } from './env.js';
import fetch from 'node-fetch';

export type StoredMemory = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt?: Date;
};

export type WorkspaceMemoryMatch = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  score: number | null;
  tags: string[];
  repoPath: string | null;
  commitHash: string | null;
};

export type WorkspaceCodeChunk = {
  id: string;
  content: string;
  path: string;
  score: number | null;
  chunkIndex: number | undefined;
};

export async function storeMemory(params: {
  userId: string;
  workspaceId: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  repoPath?: string;
  commitHash?: string;
}) {
  const embedding = await generateEmbedding(params.content);
  const chromaId = randomUUID();
  const metadata = {
    workspaceId: params.workspaceId,
    sourceType: 'memory',
    ...(params.metadata ?? {})
  };

  await upsertMemoryVector({
    id: chromaId,
    embedding,
    document: params.content,
    metadata: flattenMetadata(metadata)
  });

  const record = await createMemoryRecord({
    userId: params.userId,
    workspaceId: params.workspaceId,
    content: params.content,
    embedding,
    metadata,
    chromaId,
    tags: params.tags,
    repoPath: params.repoPath,
    commitHash: params.commitHash
  });

  return record;
}

export async function storeSessionMemory(params: {
  userId: string;
  workspaceId: string;
  input: string;
  output: string;
  sessionId: string;
}) {
  const reflection = buildReflection({ input: params.input, output: params.output });
  const content = [`Input: ${params.input}`, `Output: ${params.output}`, `Reflection: ${JSON.stringify(reflection)}`].join('\n');

  return storeMemory({
    userId: params.userId,
    workspaceId: params.workspaceId,
    content,
    metadata: {
      sessionId: params.sessionId,
      type: 'session-reflection',
      reflection
    }
  });
}

export async function searchRelevantMemories(params: {
  workspaceId: string;
  query: string;
  limit?: number;
}) {
  const embedding = await generateEmbedding(params.query);
  const vectorResult = await queryMemoryVectors({
    embedding,
    workspaceId: params.workspaceId,
    limit: params.limit ?? 3
  });

  const ids = vectorResult.ids?.[0] ?? [];
  const distances = vectorResult.distances?.[0] ?? [];
  const records = await findMemoriesByChromaIds(ids);

  return ids
    .map((id: string, index: number) => {
      const record = records.find((item) => item.chromaId === id);
      if (!record) {
        return null;
      }

      return {
        id: record.id,
        content: record.content,
        metadata: record.metadata as Record<string, unknown>,
        createdAt: record.createdAt,
        score: typeof distances[index] === 'number' ? 1 - distances[index] : null,
        tags: record.tags,
        repoPath: record.repoPath,
        commitHash: record.commitHash
      };
    })
    .filter((value): value is WorkspaceMemoryMatch => value !== null);
}

function flattenMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)])
  ) as Record<string, string>;
}

export async function askWorkspaceQuestion(params: { workspaceId: string; query: string }) {
  const embedding = await generateEmbedding(params.query);
  const vectorResult = await queryMemoryVectors({
    embedding,
    workspaceId: params.workspaceId,
    limit: 8
  });

  const rawIds = vectorResult.ids?.[0] ?? [];
  const rawDistances = vectorResult.distances?.[0] ?? [];
  const rawDocuments = vectorResult.documents?.[0] ?? [];
  const rawMetadatas = vectorResult.metadatas?.[0] ?? [];

  const memoryIds = rawIds.filter((_id: string, index: number) => rawMetadatas[index]?.sourceType === 'memory');
  const memoryRecords = await findMemoriesByChromaIds(memoryIds);

  const memories: WorkspaceMemoryMatch[] = rawIds
    .map((id: string, index: number) => {
      if (rawMetadatas[index]?.sourceType !== 'memory') {
        return null;
      }

      const record = memoryRecords.find((item) => item.chromaId === id);
      if (!record) {
        return null;
      }

      return {
        id: record.id,
        content: record.content,
        metadata: record.metadata as Record<string, unknown>,
        createdAt: record.createdAt,
        score: typeof rawDistances[index] === 'number' ? 1 - rawDistances[index] : null,
        tags: record.tags,
        repoPath: record.repoPath,
        commitHash: record.commitHash
      };
    })
    .filter((value): value is WorkspaceMemoryMatch => value !== null)
    .slice(0, 5);

  const codeChunks: WorkspaceCodeChunk[] = rawIds
    .map((id: string, index: number) => {
      if (rawMetadatas[index]?.sourceType !== 'code-chunk') {
        return null;
      }

      return {
        id,
        content: rawDocuments[index] ?? '',
        path: String(rawMetadatas[index]?.path ?? 'unknown'),
        score: typeof rawDistances[index] === 'number' ? 1 - rawDistances[index] : null,
        chunkIndex: rawMetadatas[index]?.chunkIndex ? Number(rawMetadatas[index].chunkIndex) : undefined
      };
    })
    .filter((value): value is WorkspaceCodeChunk => value !== null)
    .slice(0, 5);

  const answer = await generateWorkspaceAnswer({
    query: params.query,
    memories,
    codeChunks
  });

  return {
    answer,
    memories,
    codeChunks
  };
}

export async function ingestWorkspaceFiles(params: {
  workspaceId: string;
  files: Array<{ path: string; content: string }>;
}) {
  const acceptedFiles = params.files.filter((file) => file.content.trim().length > 0);
  let chunkCount = 0;

  for (const file of acceptedFiles) {
    const chunks = chunkText(file.content);

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await generateEmbedding(chunk);
      await upsertMemoryVector({
        id: randomUUID(),
        embedding,
        document: chunk,
        metadata: flattenMetadata({
          workspaceId: params.workspaceId,
          sourceType: 'code-chunk',
          path: file.path,
          chunkIndex: index
        })
      });
      chunkCount += 1;
    }
  }

  return {
    filesProcessed: acceptedFiles.length,
    chunksStored: chunkCount
  };
}

async function generateWorkspaceAnswer(params: {
  query: string;
  memories: WorkspaceMemoryMatch[];
  codeChunks: WorkspaceCodeChunk[];
}) {
  const prompt = [
    'You answer questions about a software workspace using only the provided context.',
    'Be concise, specific, and mention uncertainty when the context is incomplete.',
    '',
    `Question: ${params.query}`,
    '',
    'Memories:',
    params.memories.length === 0
      ? '- None'
      : params.memories
          .map((memory, index) => `${index + 1}. ${memory.content}`)
          .join('\n'),
    '',
    'Code chunks:',
    params.codeChunks.length === 0
      ? '- None'
      : params.codeChunks
          .map((chunk, index) => `${index + 1}. ${chunk.path}\n${chunk.content}`)
          .join('\n\n'),
    '',
    'Answer:'
  ].join('\n');

  try {
    const response = await fetch(`${brainEnv.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: brainEnv.ollamaChatModel,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`LLM call failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { response?: string };
    if (payload.response?.trim()) {
      return payload.response.trim();
    }
  } catch {
    // Fall back to deterministic synthesis so v1 still works without a chat model.
  }

  return buildFallbackWorkspaceAnswer(params.query, params.memories, params.codeChunks);
}

function buildFallbackWorkspaceAnswer(
  query: string,
  memories: WorkspaceMemoryMatch[],
  codeChunks: WorkspaceCodeChunk[]
) {
  if (memories.length === 0 && codeChunks.length === 0) {
    return `I could not find any workspace memory or ingested code related to "${query}" yet. Add a memory or run ingest first.`;
  }

  const lines = [
    `Question: ${query}`,
    '',
    'Relevant memories:'
  ];

  if (memories.length === 0) {
    lines.push('- No stored memories matched strongly.');
  } else {
    for (const memory of memories.slice(0, 3)) {
      const extras = [memory.repoPath, memory.tags.length > 0 ? `tags: ${memory.tags.join(', ')}` : null]
        .filter(Boolean)
        .join(' | ');
      lines.push(`- ${memory.content}${extras ? ` (${extras})` : ''}`);
    }
  }

  lines.push('', 'Relevant code chunks:');
  if (codeChunks.length === 0) {
    lines.push('- No ingested code chunks matched strongly.');
  } else {
    for (const chunk of codeChunks.slice(0, 2)) {
      lines.push(`- ${chunk.path}: ${chunk.content.slice(0, 260).replace(/\s+/g, ' ').trim()}`);
    }
  }

  return lines.join('\n');
}

function chunkText(content: string, maxChunkLength = 1200) {
  const normalized = content.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= maxChunkLength) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxChunkLength) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += maxChunkLength) {
      chunks.push(paragraph.slice(index, index + maxChunkLength));
    }

    current = '';
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
