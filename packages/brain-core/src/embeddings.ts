import fetch from 'node-fetch';
import { brainEnv } from './env.js';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${brainEnv.ollamaBaseUrl}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: brainEnv.ollamaEmbedModel,
      prompt: text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to generate embedding: ${response.status} ${details}`);
  }

  const payload = (await response.json()) as { embedding?: number[] };

  if (!payload.embedding || !Array.isArray(payload.embedding)) {
    throw new Error('Ollama did not return a valid embedding array.');
  }

  return payload.embedding;
}
