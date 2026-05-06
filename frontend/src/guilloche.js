// Deterministic guilloché wave-line generator (no Math.random).
// Produces overlapping sine-wave paths that mimic security-document engraving.

const PHI = 2.6180339887; // golden ratio offset keeps phases visually varied

export function buildGuillocheLines(width, height) {
  const lines = [];

  // ── Layer 1: primary horizontal waves ─────────────────────────────────────
  const L1_COUNT = 22;
  for (let i = 0; i < L1_COUNT; i++) {
    const baseY = (height / (L1_COUNT - 1)) * i;
    const amp   = 3.5 + (i % 5) * 0.7;
    const f1    = 0.038 + (i % 4) * 0.009;
    const f2    = f1 * 2.3;
    const ph    = (i * PHI) % (Math.PI * 2);

    let d = `M 0 ${baseY.toFixed(1)}`;
    for (let x = 0; x <= width; x += 3) {
      const y = baseY
        + amp       * Math.sin(f1 * x + ph)
        + amp * 0.4 * Math.sin(f2 * x + ph * 1.5);
      d += ` L ${x} ${y.toFixed(1)}`;
    }

    const g = 85 + Math.round((i % 6) * 15);
    lines.push({ d, stroke: `rgb(0,${g},25)`,   sw: 0.55, op: 0.38 });
  }

  // ── Layer 2: denser offset waves (slightly different freq) ────────────────
  const L2_COUNT = 18;
  for (let i = 0; i < L2_COUNT; i++) {
    const baseY = (height / L2_COUNT) * i + height / (L2_COUNT * 2);
    const amp   = 2.8 + (i % 4) * 0.6;
    const f1    = 0.058 + (i % 3) * 0.012;
    const ph    = (i * PHI * 1.5) % (Math.PI * 2);

    let d = `M 0 ${baseY.toFixed(1)}`;
    for (let x = 0; x <= width; x += 4) {
      const y = baseY + amp * Math.sin(f1 * x + ph);
      d += ` L ${x} ${y.toFixed(1)}`;
    }

    const g = 110 + Math.round((i % 5) * 14);
    lines.push({ d, stroke: `rgb(10,${g},40)`,  sw: 0.45, op: 0.28 });
  }

  // ── Layer 3: slow deep-amplitude waves ────────────────────────────────────
  const L3_COUNT = 10;
  for (let i = 0; i < L3_COUNT; i++) {
    const baseY = (height / (L3_COUNT - 1)) * i;
    const amp   = 6 + (i % 3) * 1.5;
    const f1    = 0.022 + (i % 2) * 0.008;
    const ph    = (i * PHI * 0.8) % (Math.PI * 2);

    let d = `M 0 ${baseY.toFixed(1)}`;
    for (let x = 0; x <= width; x += 5) {
      const y = baseY + amp * Math.sin(f1 * x + ph)
                      + amp * 0.3 * Math.sin(f1 * 3.1 * x + ph * 0.6);
      d += ` L ${x} ${y.toFixed(1)}`;
    }

    const g = 70 + Math.round((i % 4) * 18);
    lines.push({ d, stroke: `rgb(0,${g},15)`,   sw: 0.7,  op: 0.22 });
  }

  // ── Layer 4: fine fast ripple ─────────────────────────────────────────────
  const L4_COUNT = 28;
  for (let i = 0; i < L4_COUNT; i++) {
    const baseY = (height / (L4_COUNT - 1)) * i;
    const amp   = 1.5 + (i % 3) * 0.4;
    const f1    = 0.1  + (i % 5) * 0.015;
    const ph    = (i * PHI * 2.1) % (Math.PI * 2);

    let d = `M 0 ${baseY.toFixed(1)}`;
    for (let x = 0; x <= width; x += 2) {
      const y = baseY + amp * Math.sin(f1 * x + ph);
      d += ` L ${x} ${y.toFixed(1)}`;
    }

    const g = 130 + Math.round((i % 6) * 12);
    lines.push({ d, stroke: `rgb(20,${g},50)`,  sw: 0.35, op: 0.18 });
  }

  return lines;
}
