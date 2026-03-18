import dotenv from 'dotenv';

dotenv.config();

export const brainEnv = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
  ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
  ollamaChatModel: process.env.OLLAMA_CHAT_MODEL ?? 'llama3.2'
};
