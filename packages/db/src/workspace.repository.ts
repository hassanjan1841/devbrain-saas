import { prisma } from './prisma.js';

export async function createWorkspace(params: {
  userId: string;
  name: string;
  slug: string;
  description?: string;
}) {
  return prisma.workspace.create({
    data: {
      userId: params.userId,
      name: params.name,
      slug: params.slug,
      description: params.description
    }
  });
}

export async function listWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function findWorkspaceById(params: { userId: string; workspaceId: string }) {
  return prisma.workspace.findFirst({
    where: {
      id: params.workspaceId,
      userId: params.userId
    }
  });
}

export async function findWorkspaceBySlug(params: { userId: string; slug: string }) {
  return prisma.workspace.findFirst({
    where: {
      slug: params.slug,
      userId: params.userId
    }
  });
}

export async function countWorkspacesBySlugBase(params: { userId: string; slugBase: string }) {
  return prisma.workspace.count({
    where: {
      userId: params.userId,
      slug: {
        startsWith: params.slugBase
      }
    }
  });
}
