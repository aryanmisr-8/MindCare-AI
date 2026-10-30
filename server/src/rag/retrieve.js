// A small, dependency-free retrieval engine standing in for the HNSW + cross-encoder
// pipeline described in the algorithm analysis (Section 3.2). At this corpus size
// (dozens to low hundreds of passages) brute-force TF-IDF cosine similarity is a
// reasonable substitute for approximate nearest-neighbour search; the interface
// (embed -> search -> filter by relevance -> refuse if empty) is kept identical so
// swapping in a real vector index/embeddings API later is a drop-in change, not a
// redesign.

const { getCorpus } = require('./corpus');

const STOPWORDS = new Set([
  'the','a','an','and','or','but','is','are','was','were','be','been','to','of','in','on',
  'for','with','as','at','by','it','this','that','i','my','me','we','you','your','they',
  'them','his','her','he','she','not','no','do','does','did','have','has','had','so','if',
  'about','into','over','than','then','just','can','could','would','should','will'
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function buildVocabAndIdf(documents) {
  const df = new Map();
  documents.forEach((doc) => {
    const seen = new Set(doc.tokens);
    seen.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  });
  const idf = new Map();
  const N = documents.length;
  df.forEach((count, term) => idf.set(term, Math.log((N + 1) / (count + 1)) + 1));
  return idf;
}

function termFreqVector(tokens) {
  const tf = new Map();
  tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
  return tf;
}

function tfidfVector(tf, idf) {
  const vec = new Map();
  tf.forEach((count, term) => {
    if (idf.has(term)) vec.set(term, count * idf.get(term));
  });
  return vec;
}

function cosineSim(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  vecA.forEach((val, key) => {
    normA += val * val;
    if (vecB.has(key)) dot += val * vecB.get(key);
  });
  vecB.forEach((val) => { normB += val * val; });
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Precompute once per process — corpus is small and static-ish (swap for a real
// index rebuild-on-write if the corpus becomes dynamic/large).
let _index = null;
function buildIndex() {
  const documents = getCorpus().map((doc) => ({
    ...doc,
    tokens: tokenize(doc.text + ' ' + doc.tags.join(' '))
  }));
  const idf = buildVocabAndIdf(documents);
  documents.forEach((doc) => {
    doc.vector = tfidfVector(termFreqVector(doc.tokens), idf);
  });
  return { documents, idf };
}

const MIN_RELEVANCE = 0.05; // below this, treat context as empty rather than guessing

/**
 * Retrieve the top-k passages relevant to a free-text query, or return an empty
 * result if nothing clears the relevance floor — the caller must NOT fall back to
 * unconstrained generation in that case (see routes/journal.js).
 */
function retrieve(queryText, k = 3) {
  if (!_index) _index = buildIndex();
  const { documents, idf } = _index;

  const queryTf = termFreqVector(tokenize(queryText));
  const queryVec = tfidfVector(queryTf, idf);

  const scored = documents
    .map((doc) => ({ doc, score: cosineSim(queryVec, doc.vector) }))
    .filter((s) => s.score >= MIN_RELEVANCE)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map((s) => ({
    id: s.doc.id,
    text: s.doc.text,
    source: s.doc.source,
    reviewDate: s.doc.reviewDate,
    relevance: Number(s.score.toFixed(3))
  }));
}

module.exports = { retrieve };
