import dotenv from 'dotenv';

dotenv.config();

export const dbEnv = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  chromaUrl: process.env.CHROMA_URL ?? 'http://127.0.0.1:8000',
  chromaCollectionName: process.env.CHROMA_COLLECTION_NAME ?? 'devbrain_memories'
};
