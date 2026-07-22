// Minimal 2D PCA via power iteration — no matrix library, small N (Managemental's
// scale). Returns [{x, y}] in roughly [-1, 1], one per input vector.
export function projectTo2D(vectors) {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];

  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i] / n;
  const centered = vectors.map((v) => v.map((x, i) => x - mean[i]));

  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const norm = (a) => Math.sqrt(dot(a, a)) || 1;
  const scale = (a, k) => a.map((x) => x * k);
  const sub = (a, b) => a.map((x, i) => x - b[i]);

  // top eigenvector of the covariance matrix via power iteration, done
  // implicitly through the data matrix (never materialize a dim x dim matrix)
  function topComponent(data) {
    let v = new Array(dim).fill(0).map(() => Math.random() - 0.5);
    for (let iter = 0; iter < 60; iter++) {
      // Cv = X^T (X v)
      const scores = data.map((row) => dot(row, v));
      const next = new Array(dim).fill(0);
      for (let i = 0; i < data.length; i++) {
        for (let d = 0; d < dim; d++) next[d] += data[i][d] * scores[i];
      }
      v = scale(next, 1 / (norm(next) || 1));
    }
    return v;
  }

  const pc1 = topComponent(centered);
  // deflate, then find the second component orthogonal to the first
  const deflated = centered.map((row) => sub(row, scale(pc1, dot(row, pc1))));
  const pc2 = topComponent(deflated);

  const xs = centered.map((row) => dot(row, pc1));
  const ys = centered.map((row) => dot(row, pc2));
  const maxAbs = (arr) => Math.max(...arr.map(Math.abs), 1e-9);
  const xScale = maxAbs(xs);
  const yScale = maxAbs(ys);

  return xs.map((x, i) => ({ x: x / xScale, y: ys[i] / yScale }));
}
