import { Router } from 'express';
import { z } from 'zod';
import { askWorkspaceQuestion, ingestWorkspaceFiles } from '@devbrain/brain-core';
import { findWorkspaceById } from '@devbrain/db';
import { authMiddleware } from '../middleware/auth.js';
import { fail, ok } from '../utils.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();

const askSchema = z.object({
  workspaceId: z.string().min(1),
  query: z.string().min(2)
});

const ingestSchema = z.object({
  workspaceId: z.string().min(1),
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string().min(1)
    })
  ).min(1)
});

router.post('/ask', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = askSchema.parse(req.body);
    const workspace = await findWorkspaceById({
      userId: req.user!.userId,
      workspaceId: parsed.workspaceId
    });

    if (!workspace) {
      const result = fail('Workspace not found.', 404);
      return res.status(result.status).json(result.body);
    }

    const answer = await askWorkspaceQuestion(parsed);
    const result = ok(answer);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const result = fail('Failed to answer workspace question.', 400, error instanceof Error ? error.message : error);
    return res.status(result.status).json(result.body);
  }
});

router.post('/ingest', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = ingestSchema.parse(req.body);
    const workspace = await findWorkspaceById({
      userId: req.user!.userId,
      workspaceId: parsed.workspaceId
    });

    if (!workspace) {
      const result = fail('Workspace not found.', 404);
      return res.status(result.status).json(result.body);
    }

    const summary = await ingestWorkspaceFiles(parsed);
    const result = ok(summary, 201);
    return res.status(result.status).json(result.body);
  } catch (error) {
    const result = fail('Failed to ingest files.', 400, error instanceof Error ? error.message : error);
    return res.status(result.status).json(result.body);
  }
});

export default router;
