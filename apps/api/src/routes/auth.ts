import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createUser, findUserByEmail } from '@devbrain/db';
import { apiEnv } from '../env.js';
import { fail, ok } from '../utils.js';

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/signup', async (req, res) => {
  try {
    const parsed = authSchema.parse(req.body);
    const existing = await findUserByEmail(parsed.email);

    if (existing) {
      const result = fail('A user with that email already exists.', 409);
      return res.status(result.status).json(result.body);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const user = await createUser({ email: parsed.email, passwordHash });
    const token = jwt.sign({ userId: user.id, email: user.email }, apiEnv.jwtSecret, { expiresIn: '7d' });

    const result = ok({
      token,
      user: { id: user.id, email: user.email }
    }, 201);

    return res.status(result.status).json(result.body);
  } catch (error) {
    const result = fail('Signup failed.', 400, error instanceof Error ? error.message : error);
    return res.status(result.status).json(result.body);
  }
});

router.post('/login', async (req, res) => {
  try {
    const parsed = authSchema.parse(req.body);
    const user = await findUserByEmail(parsed.email);

    if (!user) {
      const result = fail('Invalid credentials.', 401);
      return res.status(result.status).json(result.body);
    }

    const isValid = await bcrypt.compare(parsed.password, user.passwordHash);

    if (!isValid) {
      const result = fail('Invalid credentials.', 401);
      return res.status(result.status).json(result.body);
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, apiEnv.jwtSecret, { expiresIn: '7d' });
    const result = ok({
      token,
      user: { id: user.id, email: user.email }
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    const result = fail('Login failed.', 400, error instanceof Error ? error.message : error);
    return res.status(result.status).json(result.body);
  }
});

export default router;
