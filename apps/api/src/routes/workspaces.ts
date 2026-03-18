import { Router } from 'express';
import { z } from 'zod';
import {
  countWorkspacesBySlugBase,
  createWorkspace,
  findWorkspaceById,
  listWorkspacesForUser
} from '@devbrain/db';
import { authMiddleware } from '../middleware/auth.js';
import { fail, ok } from '../utils.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional()
});

router.post('/workspaces', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = createWorkspaceSchema.parse(req.body);
    const userId = req.user!.userId;
    const slug = await generateWorkspaceSlug(userId, parsed.name);
    const workspace = await createWorkspace({
      userId,
      name: parsed.name.trim(),
      description: parsed.description?.trim() || undefined,
      slug
    });

    const result = ok({ workspace }, 201);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const result = fail('Failed to create workspace.', 400, error instanceof Error ? error.message : error);
    return res.status(result.status).json(result.body);
  }
});

router.get('/workspaces', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const workspaces = await listWorkspacesForUser(req.user!.userId);
  const result = ok({ workspaces });
  return res.status(result.status).json(result.body);
});

router.get('/workspaces/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const workspace = await findWorkspaceById({
    userId: req.user!.userId,
    workspaceId
  });

  if (!workspace) {
    const result = fail('Workspace not found.', 404);
    return res.status(result.status).json(result.body);
  }

  const result = ok({ workspace });
  return res.status(result.status).json(result.body);
});

async function generateWorkspaceSlug(userId: string, name: string) {
  const base = slugify(name);
  const count = await countWorkspacesBySlugBase({
    userId,
    slugBase: base
  });

  return count === 0 ? base : `${base}-${count + 1}`;
}

function slugify(input: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'workspace';
}

export default router;
