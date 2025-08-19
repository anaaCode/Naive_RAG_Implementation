import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const indexPath = path.join(dataDir, 'index.json');

export function ensureDataDirs() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(indexPath)) fs.writeFileSync(indexPath, JSON.stringify({ documents: [] }, null, 2));
}

function readIndex() {
  ensureDataDirs();
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

function writeIndex(index) {
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

export async function addDocumentChunks({ fileName, filePath, chunks, embeddings }) {
  const index = readIndex();
  const docId = uuidv4();
  const chunkRecords = chunks.map((text, i) => ({ id: uuidv4(), text, embedding: embeddings[i] }));
  index.documents.push({ id: docId, fileName, filePath, chunks: chunkRecords });
  writeIndex(index);
  return { docId, fileName, numChunks: chunkRecords.length };
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b; normA += a * a; normB += b * b;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-12);
}

export async function similaritySearch(queryEmbedding, topK = 3) {
  const index = readIndex();
  const scored = [];
  for (const doc of index.documents) {
    for (const c of doc.chunks) {
      const score = cosineSimilarity(queryEmbedding, c.embedding);
      scored.push({ score, text: c.text, docId: doc.id, fileName: doc.fileName });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}

export function getDocStats() {
  const index = readIndex();
  const numDocs = index.documents.length;
  const numChunks = index.documents.reduce((acc, d) => acc + d.chunks.length, 0);
  return { numDocs, numChunks };
}

