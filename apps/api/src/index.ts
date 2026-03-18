import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import memoryRoutes from './routes/memories.js';
import brainRoutes from './routes/brain.js';
import { apiEnv } from './env.js';
import { fail, ok } from './utils.js';

const app = express();

app.use(cors({ origin: apiEnv.corsOrigin === '*' ? true : apiEnv.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  const result = ok({ status: 'ok' });
  return res.status(result.status).json(result.body);
});

app.use(authRoutes);
app.use(workspaceRoutes);
app.use(memoryRoutes);
app.use(brainRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const result = fail('Internal server error.', 500, error instanceof Error ? error.message : error);
  return res.status(result.status).json(result.body);
});

app.listen(apiEnv.port, () => {
  console.log(`DevBrain API running on http://localhost:${apiEnv.port}`);
});
