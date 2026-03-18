import { Router } from 'express';
import { z } from 'zod';
import { findWorkspaceById, listMemoriesForWorkspace } from '@devbrain/db';
import { authMiddleware } from '../middleware/auth.js';
import { fail, ok } from '../utils.js';
import type { AuthenticatedRequest } from '../types.js';
import { storeMemory } from '@devbrain/brain-core';

const router = Router();

const createMemorySchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().min(3),
  tags: z.array(z.string().min(1).max(40)).optional(),
  repoPath: z.string().max(500).optional(),
  commitHash: z.string().max(120).optional()
});

const memoriesQuerySchema = z.object({
  workspaceId: z.string().min(1)
});

router.post('/memories', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = createMemorySchema.parse(req.body);
    const workspace = await findWorkspaceById({
      userId: req.user!.userId,
      workspaceId: parsed.workspaceId
    });

    if (!workspace) {
      const result = fail('Workspace not found.', 404);
      return res.status(result.status).json(result.body);
    }

    const memory = await storeMemory({
      userId: req.user!.userId,
      workspaceId: parsed.workspaceId,
      content: parsed.content,
      tags: parsed.tags,
      repoPath: parsed.repoPath,
      commitHash: parsed.commitHash,
      metadata: {
        tags: parsed.tags ?? [],
        repoPath: parsed.repoPath ?? null,
        commitHash: parsed.commitHash ?? null
      }
    });

    const result = ok({ memory }, 201);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const result = fail('Failed to create memory.', 400, error instanceof Error ? error.message : error);
    return res.status(result.status).json(result.body);
  }
});

router.get('/memories', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = memoriesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    const result = fail('workspaceId query parameter is required.', 400, parsed.error.flatten());
    return res.status(result.status).json(result.body);
  }

  const workspace = await findWorkspaceById({
    userId: req.user!.userId,
    workspaceId: parsed.data.workspaceId
  });

  if (!workspace) {
    const result = fail('Workspace not found.', 404);
    return res.status(result.status).json(result.body);
  }

  const memories = await listMemoriesForWorkspace({
    userId: req.user!.userId,
    workspaceId: parsed.data.workspaceId
  });

  const result = ok({ memories });
  return res.status(result.status).json(result.body);
});

export default router;
