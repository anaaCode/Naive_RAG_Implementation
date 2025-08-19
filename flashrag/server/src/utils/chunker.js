export function chunkText(text, chunkSize = 700, overlap = 120) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return [];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    const chunk = clean.slice(start, end);
    chunks.push(chunk);
    if (end === clean.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

