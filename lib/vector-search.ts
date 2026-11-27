// Server-only semantic search over the prebuilt clinic embedding index.
// The index (data/seed-embeddings.json) is built by
// scripts/build-embeddings.py: one chunk per comparable price row plus
// one chunk per clinic with no published prices, embedded with
// gemini-embedding-001 at 128 dims and quantized to int8 (per-vector
// scale = max absolute value) so the file stays plain UTF-8 text.
//
// This is the fallback retriever for the AI chat: keyword facts
// (findTreatmentFacts in lib/ai-chat.ts) run first, and vector search
// only runs when they come back empty — for paraphrases and questions
// no keyword list covers. Price chunks are the only ones that can
// ground an answer; clinic chunks (no prices) are returned only when
// no price chunk matches, so the model can at least name clinics.
import index from "@/data/seed-embeddings.json";

export type IndexChunk = {
  text: string;
  clinic: string;
  city: string;
  metro: string;
  treatment: string;
  price: string;
  unit: string;
  kind: "price" | "clinic";
  vec: string;
  scale: number;
};

export type ScoredChunk = IndexChunk & { score: number };

const DIMS = (index as { dims: number }).dims;
const CHUNKS = (index as { chunks: IndexChunk[] }).chunks;

// Dequantized, unit-normalized vectors, decoded once at cold start.
const VECTORS: Float32Array[] = CHUNKS.map((c) => {
  const bytes = Buffer.from(c.vec, "base64");
  const v = new Float32Array(DIMS);
  let norm = 0;
  for (let i = 0; i < DIMS; i++) {
    const b = bytes[i] ?? 0;
    const q = b > 127 ? b - 256 : b;
    const val = (q / 127) * c.scale;
    v[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIMS; i++) v[i] /= norm;
  return v;
});

function cosine(query: Float32Array, v: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < DIMS; i++) dot += query[i] * v[i];
  return dot;
}

export type SearchOptions = {
  /** When set, in-metro chunks rank first; falls back to nationwide. */
  metro?: string;
  topK?: number;
  minScore?: number;
};

export function searchVectors(
  queryVec: number[],
  opts: SearchOptions = {},
): ScoredChunk[] {
  const topK = opts.topK ?? 5;
  const minScore = opts.minScore ?? 0.3;
  if (queryVec.length !== DIMS) return [];
  const q = new Float32Array(DIMS);
  let norm = 0;
  for (let i = 0; i < DIMS; i++) {
    q[i] = queryVec[i] ?? 0;
    norm += q[i] * q[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return [];
  for (let i = 0; i < DIMS; i++) q[i] /= norm;

  const scored: ScoredChunk[] = [];
  for (let i = 0; i < CHUNKS.length; i++) {
    const score = cosine(q, VECTORS[i]);
    if (score < minScore) continue;
    scored.push({ ...CHUNKS[i], score });
  }
  scored.sort((a, b) => b.score - a.score);
  // Metro first when requested, keeping score order within each group.
  if (opts.metro) {
    const inMetro = scored.filter((c) => c.metro === opts.metro);
    const rest = scored.filter((c) => c.metro !== opts.metro);
    const merged = [...inMetro, ...rest];
    // If the metro has price chunks, answer from those only; otherwise
    // fall back to the nationwide best.
    const metroPrices = inMetro.filter((c) => c.kind === "price");
    if (metroPrices.length > 0) return metroPrices.slice(0, topK);
    return merged.slice(0, topK);
  }
  return scored.slice(0, topK);
}

// Format retrieved chunks into the fact-line shape buildSystemPrompt
// expects: { label, facts }. Price chunks become price fact lines
// (same shape as findTreatmentFacts); clinic chunks become name lines.
// The label is deliberately generic ("related treatments"): vector hits
// are semantically related, not one treatment, so naming the first
// chunk's treatment would mislabel the rest. buildSystemPrompt only
// prints the fact lines when a label is set, so clinic-only results
// need one too.
export function chunksToFacts(chunks: ScoredChunk[]): {
  label: string | null;
  facts: string[];
} {
  const prices = chunks.filter((c) => c.kind === "price");
  const clinics = chunks.filter((c) => c.kind === "clinic");
  if (prices.length > 0) {
    return {
      label: "related treatments",
      facts: prices
        .slice(0, 5)
        .map(
          (c) =>
            `${c.clinic} (${c.city}): ${c.treatment} ${c.price}${c.unit ? ` ${c.unit}` : ""}`,
        ),
    };
  }
  if (clinics.length > 0) {
    return {
      label: "clinics offering related treatments",
      facts: clinics
        .slice(0, 5)
        .map((c) => `${c.clinic} (${c.city}) — ${c.text}`),
    };
  }
  return { label: null, facts: [] };
}
