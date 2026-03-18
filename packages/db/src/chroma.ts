import { ChromaClient, type Collection } from 'chromadb';
import { dbEnv } from './env.js';

const client = new ChromaClient({ path: dbEnv.chromaUrl });
let collectionPromise: Promise<Collection> | null = null;

export async function getMemoryCollection(): Promise<Collection> {
  if (!collectionPromise) {
    collectionPromise = client.getOrCreateCollection({
      name: dbEnv.chromaCollectionName,
      metadata: { description: 'DevBrain memory embeddings' }
    });
  }

  return collectionPromise;
}

export async function upsertMemoryVector(params: {
  id: string;
  embedding: number[];
  document: string;
  metadata: Record<string, string | number | boolean>;
}) {
  const collection = await getMemoryCollection();
  await collection.upsert({
    ids: [params.id],
    embeddings: [params.embedding],
    documents: [params.document],
    metadatas: [params.metadata]
  });
}

export async function queryMemoryVectors(params: {
  embedding: number[];
  workspaceId: string;
  limit?: number;
}) {
  const collection = await getMemoryCollection();

  const result = await collection.query({
    queryEmbeddings: [params.embedding],
    nResults: params.limit ?? 3,
    where: { workspaceId: params.workspaceId }
  });

  return result;
}
