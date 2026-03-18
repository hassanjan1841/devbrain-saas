import { prisma } from './prisma.js';

export async function createSessionRecord(params: {
  userId: string;
  workspaceId: string;
  input: string;
  output: string;
}) {
  return prisma.session.create({
    data: params
  });
}

export async function listSessionsForUser(userId: string, take = 20) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take
  });
}

export async function listSessionsForWorkspace(params: {
  userId: string;
  workspaceId: string;
  take?: number;
}) {
  return prisma.session.findMany({
    where: {
      userId: params.userId,
      workspaceId: params.workspaceId
    },
    orderBy: { createdAt: 'desc' },
    take: params.take ?? 20
  });
}
