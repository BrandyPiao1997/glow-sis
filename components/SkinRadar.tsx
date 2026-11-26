"use client";

import type { SkinDimensionScores } from "@/lib/skin-analysis";

// 4-dimension radar chart for the skin report, modeled on SoYoung's:
// sensitivity (top), skin tone (right), skin texture (bottom), skin age (left).
// Pure SVG, no chart library.
export default function SkinRadar({
  scores,
  size = 220,
}: {
  scores: SkinDimensionScores;
  size?: number;
}) {
  const c = size / 2;
  const r = size / 2 - 14;
  const values = [scores.sensitivity, scores.skinTone, scores.skinTexture, scores.skinAge];
  const point = (i: number, v: number) => {
    const angle = (Math.PI / 2) * i - Math.PI / 2; // start at top, clockwise
    const rad = (v / 100) * r;
    return [c + rad * Math.cos(angle), c + rad * Math.sin(angle)] as const;
  };
  const poly = values.map((v, i) => point(i, v).join(",")).join(" ");
  const grid = [100, 60].map((v) => {
    const pts = [0, 1, 2, 3].map((i) => point(i, v).join(",")).join(" ");
    return <polygon key={v} points={pts} fill="none" stroke="#e5d9d2" strokeWidth="1" />;
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Skin score radar chart"
      className="mx-auto"
    >
      <circle cx={c} cy={c} r={r} fill="none" stroke="#e5d9d2" strokeWidth="1" />
      {grid}
      <polygon points={poly} fill="#d6336c" fillOpacity="0.18" stroke="#d6336c" strokeWidth="2" />
      {values.map((v, i) => {
        const [x, y] = point(i, v);
        return <circle key={i} cx={x} cy={y} r="4" fill="#d6336c" />;
      })}
    </svg>
  );
}
