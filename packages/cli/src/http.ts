import fetch from 'node-fetch';
import { loadConfig } from './config.js';

export async function request<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}) {
  const config = loadConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (options.auth && config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  return response.json() as Promise<{
    success: boolean;
    data?: T;
    error?: { message: string; details?: unknown };
  }>;
}
