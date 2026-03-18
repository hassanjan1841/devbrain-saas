import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export async function createMemoryRecord(params: {
  userId: string;
  workspaceId: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  chromaId: string;
  tags?: string[];
  repoPath?: string;
  commitHash?: string;
}) {
  return prisma.memory.create({
    data: {
      userId: params.userId,
      workspaceId: params.workspaceId,
      content: params.content,
      embedding: params.embedding,
      metadata: params.metadata as Prisma.InputJsonValue,
      chromaId: params.chromaId,
      tags: params.tags ?? [],
      repoPath: params.repoPath,
      commitHash: params.commitHash
    }
  });
}

export async function findMemoriesByChromaIds(chromaIds: string[]) {
  return prisma.memory.findMany({
    where: {
      chromaId: { in: chromaIds }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function listMemoriesForUser(userId: string, take = 20) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take
  });
}

export async function listMemoriesForWorkspace(params: {
  userId: string;
  workspaceId: string;
  take?: number;
}) {
  return prisma.memory.findMany({
    where: {
      userId: params.userId,
      workspaceId: params.workspaceId
    },
    orderBy: { createdAt: 'desc' },
    take: params.take ?? 50
  });
}
