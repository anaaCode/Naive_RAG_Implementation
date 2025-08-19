import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import { chunkText } from './utils/chunker.js';
import { embedTexts, generateAnswer } from './utils/embedding.js';
import { addDocumentChunks, similaritySearch, ensureDataDirs, getDocStats } from './utils/vectorStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

ensureDataDirs();

const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

async function extractTextFromFile(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType.startsWith('text/')) {
    return buffer.toString('utf-8');
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

app.get('/api/docs/stats', (_req, res) => {
  res.json(getDocStats());
});

app.post('/api/upload', upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const ingestResults = [];
    for (const file of files) {
      const text = await extractTextFromFile(file.path, file.mimetype);
      const chunks = chunkText(text, 700, 120);
      const embeddings = await embedTexts(chunks);
      const stats = await addDocumentChunks({
        fileName: file.originalname,
        filePath: file.path,
        chunks,
        embeddings
      });
      ingestResults.push(stats);
    }
    res.json({ message: 'Ingested', ingestResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { question, topK = 3, model = 'gpt-4o-mini' } = req.body || {};
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const [queryEmbedding] = await embedTexts([question]);
    const results = await similaritySearch(queryEmbedding, Number(topK));

    const contextBlocks = results.map((r, idx) => `Source ${idx + 1} (score ${r.score.toFixed(3)}):\n${r.text}`).join('\n\n');
    const prompt = `You are a helpful assistant. Use ONLY the following sources to answer. If missing, say you don't know.\n\nSOURCES:\n${contextBlocks}\n\nQUESTION: ${question}`;
    const answer = await generateAnswer(prompt, model);
    res.json({ answer, sources: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FlashRAG server listening on http://localhost:${PORT}`);
});

