FlashRAG+ (Naive RAG)

Quickstart

1) Requirements
- Node.js 18+
- An OpenAI API key with access to embeddings and chat models

2) Environment

Create `server/.env` with:

```
OPENAI_API_KEY=sk-... # your key
EMBED_MODEL=text-embedding-3-small
PORT=5000
```

3) Install

```
cd /workspace/flashrag/server && npm i
cd /workspace/flashrag/client && npm i
```

4) Run

Open two terminals:

```
cd /workspace/flashrag/server && npm run dev
```

```
cd /workspace/flashrag/client && npm run dev
```

Visit http://localhost:5173

What this project does

- Upload: Accepts PDF/DOCX/TXT, extracts text, chunks with overlap
- Embed: Generates embeddings (OpenAI `text-embedding-3-small`)
- Store: Saves chunks and vectors in `server/data/index.json`
- Retrieve: Cosine similarity search with Top-K
- Generate: Sends retrieved context plus question to an LLM to answer

Endpoints

- POST `/api/upload` multipart form: `files[]`
- POST `/api/chat` JSON: `{ question, topK, model }`
- GET `/api/docs/stats`

Notes

- This is a naive local vector store for demo only. For production, use a vector DB (e.g. pgvector, Pinecone, Qdrant) and add auth.

