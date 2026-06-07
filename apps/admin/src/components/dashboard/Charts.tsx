"use client";

/**
 * 차트 — prototype/assets/scripts/core/admin-charts.js 의 SVG 생성 로직을 그대로 React 이식.
 * 의존성 없는 경량 SVG(LineChart / BarChart / DonutChart). 마크업·좌표·색상 동일.
 */
import { useMemo } from "react";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function niceStep(max: number, target: number): { step: number; max: number } {
  const raw = max / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step: number;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  step *= mag;
  return { step, max: Math.ceil(max / step) * step };
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export type LineSeries = { name: string; color: string; data: number[] };

/* ---------- LINE (one or two series) ---------- */
export function LineChart({
  labels,
  series,
  yfmt,
}: {
  labels: string[];
  series: LineSeries[];
  yfmt?: (v: number) => string;
}) {
  const W = 720,
    H = 250,
    pl = 46,
    pr = 16,
    pt = 16,
    pb = 34;
  const iw = W - pl - pr,
    ih = H - pt - pb;

  const uid = useMemo(() => "lc" + Math.random().toString(36).slice(2, 7), []);

  let max = 0;
  series.forEach((s) => s.data.forEach((v) => { if (v > max) max = v; }));
  max = max * 1.15 || 1;
  const nice = niceStep(max, 4);
  const ymax = nice.max,
    step = nice.step;
  const x = (i: number) => pl + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1));
  const y = (v: number) => pt + ih - (v / ymax) * ih;

  const grid: React.ReactNode[] = [];
  const yl: React.ReactNode[] = [];
  let gi = 0;
  for (let v = 0; v <= ymax + 1; v += step) {
    const yy = y(v);
    grid.push(<line key={`g${gi}`} x1={pl} y1={+yy.toFixed(1)} x2={W - pr} y2={+yy.toFixed(1)} stroke="#EEF1F5" />);
    yl.push(
      <text key={`yl${gi}`} x={pl - 9} y={+(yy + 4).toFixed(1)} textAnchor="end" fontSize="11" fill="#9CA3AF">
        {yfmt ? yfmt(v) : fmt(v)}
      </text>
    );
    gi++;
  }
  const xl = labels.map((l, i) => (
    <text key={`xl${i}`} x={+x(i).toFixed(1)} y={H - 12} textAnchor="middle" fontSize="11" fill="#9CA3AF">
      {l}
    </text>
  ));

  const areas: React.ReactNode[] = [];
  const paths: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  series.forEach((s, si) => {
    const pts = s.data.map((v, i) => [+x(i).toFixed(1), +y(v).toFixed(1)] as [number, number]);
    const dp = smoothPath(pts);
    const col = s.color;
    // 데이터 점 <2개면 path 가 비어(`""`) area/line d 속성이 깨짐 → 가드 (점 1개는 아래 dot 로만 표기)
    if (dp) {
      if (si === 0) {
        areas.push(
          <defs key="def">
            <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={col} stopOpacity="0.16" />
              <stop offset="1" stopColor={col} stopOpacity="0" />
            </linearGradient>
          </defs>
        );
        areas.push(
          <path key="area" d={`${dp} L ${x(labels.length - 1)} ${pt + ih} L ${x(0)} ${pt + ih} Z`} fill={`url(#${uid})`} />
        );
      }
      paths.push(<path key={`p${si}`} d={dp} fill="none" stroke={col} strokeWidth="2.4" strokeLinecap="round" />);
    }
    pts.forEach((p, i) => {
      if (i === pts.length - 1 || labels.length <= 12)
        dots.push(
          <circle key={`d${si}-${i}`} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 2.6} fill="#fff" stroke={col} strokeWidth="2" />
        );
    });
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {grid}
      {yl}
      {areas}
      {paths}
      {dots}
      {xl}
    </svg>
  );
}

export type BarItemT = { label: string; value: number; color?: string };

/* ---------- BAR (categorical) ---------- */
export function BarChart({ items, yfmt }: { items: BarItemT[]; yfmt?: (v: number) => string }) {
  const W = 720,
    H = 250,
    pl = 46,
    pr = 16,
    pt = 16,
    pb = 34;
  const iw = W - pl - pr,
    ih = H - pt - pb;
  let max = 0;
  items.forEach((it) => { if (it.value > max) max = it.value; });
  const nice = niceStep(max * 1.15 || 1, 4);
  const ymax = nice.max,
    step = nice.step;
  const y = (v: number) => pt + ih - (v / ymax) * ih;
  const band = iw / (items.length || 1),
    bw = Math.min(54, band * 0.5);

  const grid: React.ReactNode[] = [];
  const yl: React.ReactNode[] = [];
  let gi = 0;
  for (let v = 0; v <= ymax + 1; v += step) {
    const yy = y(v);
    grid.push(<line key={`g${gi}`} x1={pl} y1={+yy.toFixed(1)} x2={W - pr} y2={+yy.toFixed(1)} stroke="#EEF1F5" />);
    yl.push(
      <text key={`yl${gi}`} x={pl - 9} y={+(yy + 4).toFixed(1)} textAnchor="end" fontSize="11" fill="#9CA3AF">
        {yfmt ? yfmt(v) : fmt(v)}
      </text>
    );
    gi++;
  }
  const bars: React.ReactNode[] = [];
  const xl: React.ReactNode[] = [];
  items.forEach((it, i) => {
    const cx = pl + band * i + band / 2,
      h = (it.value / ymax) * ih,
      yy = pt + ih - h;
    bars.push(
      <rect key={`r${i}`} x={+(cx - bw / 2).toFixed(1)} y={+yy.toFixed(1)} width={+bw.toFixed(1)} height={+Math.max(h, 0).toFixed(1)} rx="5" fill={it.color || "#2563EB"} />
    );
    bars.push(
      <text key={`bv${i}`} x={+cx.toFixed(1)} y={+(yy - 7).toFixed(1)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">
        {fmt(it.value)}
      </text>
    );
    xl.push(
      <text key={`bl${i}`} x={+cx.toFixed(1)} y={H - 12} textAnchor="middle" fontSize="11" fill="#6B7280">
        {it.label}
      </text>
    );
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      {grid}
      {yl}
      {bars}
      {xl}
    </svg>
  );
}

export type DonutSeg = { label: string; value: number; color: string };

/* ---------- DONUT ---------- */
export function DonutChart({
  segments,
  size = 180,
  sw = 22,
  centerTop,
  centerSub,
}: {
  segments: DonutSeg[];
  size?: number;
  sw?: number;
  centerTop?: string;
  centerSub?: string;
}) {
  const r = size / 2 - 14,
    cx = size / 2,
    cy = size / 2,
    Circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let off = 0;
  const arcs = segments.map((s, i) => {
    const frac = s.value / total,
      len = frac * Circ;
    const el = (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={sw}
        strokeDasharray={`${len.toFixed(2)} ${(Circ - len).toFixed(2)}`}
        strokeDashoffset={(-off).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="butt"
      />
    );
    off += len;
    return el;
  });
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ flex: "0 0 auto" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F3F6" strokeWidth={sw} />
      {arcs}
      {centerTop != null && (
        <>
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="#111827">
            {centerTop}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#9CA3AF">
            {centerSub || ""}
          </text>
        </>
      )}
    </svg>
  );
}
