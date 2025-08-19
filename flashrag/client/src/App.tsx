import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';

type Source = { score: number; text: string; docId: string; fileName: string };

export default function App() {
  const [topK, setTopK] = useState<number>(3);
  const [model, setModel] = useState<string>('gpt-4o-mini');
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ingestStats, setIngestStats] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canAsk = useMemo(() => question.trim().length > 0, [question]);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const form = new FormData();
    for (const f of Array.from(files)) form.append('files', f);
    try {
      setIngestStats('Uploading...');
      const res = await axios.post('/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const msg = (res.data?. ingestResults || [])
        .map((r: any) => `${r.fileName}: ${r.numChunks} chunks`)
        .join(', ');
      setIngestStats(`Ingested: ${msg}`);
    } catch (e: any) {
      setIngestStats(`Upload failed: ${e?.response?.data?.error || e.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onAsk() {
    if (!canAsk) return;
    setIsLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const res = await axios.post('/api/chat', { question, topK, model });
      setAnswer(res.data?.answer || '');
      setSources(res.data?.sources || []);
    } catch (e: any) {
      setAnswer(e?.response?.data?.error || e.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">FlashRAG+</div>
        <nav>
          <a className="active">Home</a>
          <a>Chat</a>
          <a>Upload</a>
          <a>Settings</a>
        </nav>
        <div className="history">
          <div className="h-title">Chat History</div>
          <div className="h-item">Research_Paper_AI.pdf</div>
          <div className="h-msg">What is the main conclusion?</div>
          <div className="h-msg">Explain the methodology</div>
        </div>
      </aside>
      <main className="content">
        <div className="panel">
          <div className="panel-title">RAG Pipeline Configuration</div>
          <div className="pipeline">
            <Chip title="Query Processor" badges={["Auto", "Trace", "Sure"]} />
            <Chip title="Retriever" badges={["Auto", "RePlug", "AAR"]} color="green" />
            <Chip title="Reranker" badges={["Auto", "SKR", "Adaptive"]} color="purple" />
            <Chip title="Generator" badges={["Auto", "RET-Robust", "RetGen"]} color="orange" />
            <Chip title="Reasoner" badges={["Auto", "R1"]} />
          </div>
          <div className="controls">
            <div className="control">
              <label>Top-K</label>
              <input type="range" min={1} max={10} value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))} />
              <span className="k">{topK}</span>
            </div>
            <div className="control">
              <label>LLM</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="gpt-4o-mini">OpenAI - gpt-4o-mini</option>
                <option value="gpt-4o">OpenAI - gpt-4o</option>
                <option value="gpt-4o-mini-tts">OpenAI - gpt-4o-mini-tts</option>
              </select>
            </div>
          </div>
        </div>

        <div className="upload">
          <div className="u-title">Document Upload</div>
          <div className="u-drop" onClick={() => fileInputRef.current?.click()}>
            <div className="u-hint">Drop files here or click to browse</div>
            <div className="u-sub">PDF, DOCX, TXT · Max 5 files · 20MB each</div>
          </div>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                 accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                 onChange={(e) => onUpload(e.target.files)} />
          {ingestStats && <div className="u-stats">{ingestStats}</div>}
        </div>

        <div className="chatbox">
          <input
            placeholder="Ask anything about your documents..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button onClick={onAsk} disabled={!canAsk || isLoading}>
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </div>

        {(answer || sources.length > 0) && (
          <div className="result">
            {answer && <div className="answer" dangerouslySetInnerHTML={{ __html: formatAnswer(answer) }} />}
            {sources.length > 0 && (
              <div className="sources">
                <div className="s-title">Sources</div>
                {sources.map((s, i) => (
                  <div key={i} className="source">
                    <div className="s-head">{s.fileName} · score {s.score.toFixed(3)}</div>
                    <div className="s-text">{s.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Chip({ title, badges, color }: { title: string; badges?: string[]; color?: 'green' | 'purple' | 'orange' }) {
  return (
    <div className={`chip ${color || ''}`}>
      <div className="c-title">{title}</div>
      <div className="c-badges">
        {badges?.map((b) => (
          <span key={b} className="badge">{b}</span>
        ))}
      </div>
    </div>
  );
}

function formatAnswer(text: string) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br/>');
}

