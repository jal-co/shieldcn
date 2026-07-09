"use strict";

// src/main.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// ../core/src/format.ts
function formatCount(count) {
  if (count >= 1e6) {
    const value = count / 1e6;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`;
  }
  if (count >= 1e3) {
    const value = count / 1e3;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`;
  }
  return count.toLocaleString("en-US");
}

// ../core/src/badges/themes.ts
var themes = {
  // --- Neutrals ---
  // Single background color for the whole badge.
  // labelFg = muted text for the label side (lower opacity)
  // valueFg = bright text for the value side
  zinc: {
    labelBg: "#27272a",
    // zinc-800 — badge/label background
    labelFg: "#a1a1aa",
    // zinc-400 — muted label text
    valueBg: "#3f3f46",
    // zinc-700 — value side (for split/flat mode)
    valueFg: "#fafafa",
    // zinc-50  — bright value text
    border: "#3f3f46"
    // zinc-700
  },
  slate: {
    labelBg: "#1e293b",
    labelFg: "#94a3b8",
    valueBg: "#334155",
    // slate-700
    valueFg: "#f8fafc",
    border: "#334155"
  },
  stone: {
    labelBg: "#292524",
    labelFg: "#a8a29e",
    valueBg: "#44403c",
    // stone-700
    valueFg: "#fafaf9",
    border: "#44403c"
  },
  neutral: {
    labelBg: "#262626",
    labelFg: "#a3a3a3",
    valueBg: "#404040",
    // neutral-700
    valueFg: "#fafafa",
    border: "#404040"
  },
  gray: {
    labelBg: "#1f2937",
    labelFg: "#9ca3af",
    valueBg: "#374151",
    // gray-700
    valueFg: "#f9fafb",
    border: "#374151"
  },
  // --- Colors ---
  // Entire badge is the accent color. Label text is a lighter tint,
  // value text is white.
  blue: {
    labelBg: "#2563eb",
    // blue-600 — badge background
    labelFg: "#93c5fd",
    // blue-300 — muted label
    valueBg: "#2563eb",
    valueFg: "#ffffff",
    border: "#3b82f6"
  },
  green: {
    labelBg: "#16a34a",
    // green-600
    labelFg: "#86efac",
    // green-300
    valueBg: "#16a34a",
    valueFg: "#ffffff",
    border: "#22c55e"
  },
  rose: {
    labelBg: "#e11d48",
    // rose-600
    labelFg: "#fda4af",
    // rose-300
    valueBg: "#e11d48",
    valueFg: "#ffffff",
    border: "#f43f5e"
  },
  orange: {
    labelBg: "#ea580c",
    // orange-600
    labelFg: "#fdba74",
    // orange-300
    valueBg: "#ea580c",
    valueFg: "#ffffff",
    border: "#f97316"
  },
  amber: {
    labelBg: "#d97706",
    // amber-600
    labelFg: "#fcd34d",
    // amber-300
    valueBg: "#d97706",
    valueFg: "#ffffff",
    border: "#f59e0b"
  },
  violet: {
    labelBg: "#7c3aed",
    // violet-600
    labelFg: "#c4b5fd",
    // violet-300
    valueBg: "#7c3aed",
    valueFg: "#ffffff",
    border: "#8b5cf6"
  },
  purple: {
    labelBg: "#9333ea",
    // purple-600
    labelFg: "#d8b4fe",
    // purple-300
    valueBg: "#9333ea",
    valueFg: "#ffffff",
    border: "#a855f7"
  },
  red: {
    labelBg: "#dc2626",
    // red-600
    labelFg: "#fca5a5",
    // red-300
    valueBg: "#dc2626",
    valueFg: "#ffffff",
    border: "#ef4444"
  },
  cyan: {
    labelBg: "#0891b2",
    // cyan-600
    labelFg: "#67e8f9",
    // cyan-300
    valueBg: "#0891b2",
    valueFg: "#ffffff",
    border: "#06b6d4"
  },
  emerald: {
    labelBg: "#059669",
    // emerald-600
    labelFg: "#6ee7b7",
    // emerald-300
    valueBg: "#059669",
    valueFg: "#ffffff",
    border: "#10b981"
  }
};
var NAMED_COLORS = {
  brightgreen: "44cc11",
  green: "16a34a",
  yellow: "d97706",
  yellowgreen: "a3e635",
  orange: "ea580c",
  red: "dc2626",
  blue: "2563eb",
  grey: "6b7280",
  gray: "6b7280",
  lightgrey: "9ca3af",
  lightgray: "9ca3af",
  critical: "dc2626",
  important: "ea580c",
  success: "16a34a",
  informational: "2563eb",
  inactive: "9ca3af",
  // CSS named colors (common subset)
  black: "000000",
  white: "ffffff",
  purple: "9333ea",
  violet: "7c3aed",
  pink: "ec4899",
  cyan: "0891b2",
  teal: "0d9488",
  lime: "84cc16",
  indigo: "6366f1"
};
function resolveColor(color) {
  if (!color) return void 0;
  const lower = color.toLowerCase().trim();
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower];
  const hex = lower.replace(/^#/, "");
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) return void 0;
  if (hex.length <= 4) return hex.split("").map((c) => c + c).join("");
  return hex;
}

// ../core/src/badges/svg-text-utils.ts
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function r2(n) {
  return Math.round(n * 100) / 100;
}

// ../core/src/badges/render-chart.ts
var SURFACE = {
  dark: {
    bg: "#09090b",
    // zinc-950 (card)
    border: "#27272a",
    // zinc-800
    grid: "#27272a",
    muted: "#a1a1aa",
    // zinc-400
    fg: "#fafafa"
    // zinc-50
  },
  light: {
    bg: "#ffffff",
    border: "#e4e4e7",
    // zinc-200
    grid: "#e4e4e7",
    muted: "#71717a",
    // zinc-500
    fg: "#18181b"
    // zinc-900
  }
};
var SHIELDCN_LOGO = '<path d="M1088.4,565.1c-6.5-4.7-15.5,0-15.5,7.9v510.2c0,21.3-18.1,38.6-40.4,38.6H160.9c-22.3,0-40.4,17.3-40.4,38.6v280.8c0,21.3,18.1,38.6,40.4,38.6h1004.5c10.8,0,21.2-4.2,28.8-11.6l273.4-266.3c7.4-7.2,11.6-16.9,11.6-27v-308.7c0-12.1-5.9-23.5-16.1-30.8l-374.7-270.3Z"/><path d="M511.2,1035.9c6.5,4.7,15.5,0,15.5-7.9v-510.2c0-21.3,18.1-38.6,40.4-38.6h871.7c22.3,0,40.4-17.3,40.4-38.6V159.7c0-21.3-18.1-38.6-40.4-38.6H434.3c-10.8,0-21.2,4.2-28.8,11.6L132,399c-7.4,7.2-11.6,16.9-11.6,27v308.7c0,12.1,5.9,23.5,16.1,30.8l374.7,270.3Z"/>';
var SANS_FALLBACK = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
var MONO_FALLBACK = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
var FONT_STACKS = {
  inter: `'Inter', ${SANS_FALLBACK}`,
  geist: `'Geist', ${SANS_FALLBACK}`,
  "geist-mono": `'Geist Mono', ${MONO_FALLBACK}`,
  "jetbrains-mono": `'JetBrains Mono', ${MONO_FALLBACK}`,
  "fira-code": `'Fira Code', ${MONO_FALLBACK}`,
  roboto: `'Roboto', ${SANS_FALLBACK}`,
  "space-grotesk": `'Space Grotesk', ${SANS_FALLBACK}`,
  // Friendly generic aliases.
  sans: SANS_FALLBACK,
  mono: MONO_FALLBACK,
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
};
var DEFAULT_FONT = FONT_STACKS.inter;
function resolveFontFamily(font) {
  if (font && FONT_STACKS[font]) return FONT_STACKS[font];
  return DEFAULT_FONT;
}
var DEFAULT_ACCENT = "#3b82f6";
function resolveAccent(theme, color) {
  const c = resolveColor(color);
  if (c) return `#${c}`;
  if (theme && theme in themes) return themes[theme].border;
  return DEFAULT_ACCENT;
}
function rgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function dateLabel(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
function niceMax(value) {
  if (value <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    const candidate = s * pow;
    if (candidate >= value) return candidate;
  }
  return 10 * pow;
}
function renderChart(cfg) {
  const { width, height, mode, area, series } = cfg;
  const surf = SURFACE[mode];
  const fontStack = cfg.fontFamily ?? DEFAULT_FONT;
  const showBorder = cfg.border !== false;
  const cardBg = cfg.background === "transparent" ? "none" : cfg.background ?? surf.bg;
  const dotHalo = cfg.background === "transparent" ? "none" : cardBg;
  const padTop = 64;
  const padBottom = 36;
  const padLeft = 56;
  const padRight = 24;
  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);
  const hasDates = series.length > 0 && series.every(
    (s) => s.points.length > 0 && s.points.every((p) => p.date && !isNaN(new Date(p.date).getTime()))
  );
  let tMin = Infinity;
  let tMax = -Infinity;
  let yMaxData = 0;
  let yMinPositive = Infinity;
  for (const s of series) {
    for (const p of s.points) {
      if (hasDates && p.date) {
        const t = new Date(p.date).getTime();
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      }
      if (p.value > yMaxData) yMaxData = p.value;
      if (p.value > 0 && p.value < yMinPositive) yMinPositive = p.value;
    }
  }
  if (!isFinite(tMin) || !isFinite(tMax) || tMax === tMin) {
    const base = isFinite(tMin) ? tMin : Date.now();
    tMin = base - 864e5;
    tMax = base + 864e5;
  }
  const yScale = cfg.yScale === "log" ? "log" : "linear";
  const yTickCount = Math.min(10, Math.max(1, Math.round(cfg.yTicks ?? 4)));
  const xTickCount = Math.min(12, Math.max(2, Math.round(cfg.xTicks ?? 3)));
  let yBottom = cfg.yMin ?? (yScale === "log" ? isFinite(yMinPositive) ? yMinPositive : 1 : 0);
  if (yScale === "log" && yBottom <= 0) yBottom = 1;
  let yTop = cfg.yMax ?? (yScale === "log" ? Math.max(yMaxData, yBottom * 10) : niceMax(yMaxData));
  if (yTop <= yBottom) yTop = yBottom + (yScale === "log" ? yBottom * 9 : 1);
  const xOfDate = (iso) => {
    const t = new Date(iso).getTime();
    const frac = (t - tMin) / (tMax - tMin);
    return padLeft + Math.min(1, Math.max(0, frac)) * plotW;
  };
  const xOfIndex = (i, len) => padLeft + (len <= 1 ? 0 : i / (len - 1)) * plotW;
  const yOf = (value) => {
    let frac;
    if (yScale === "log") {
      const lb = Math.log10(yBottom);
      const lt = Math.log10(yTop);
      const lv = Math.log10(Math.max(value, yBottom));
      frac = lt === lb ? 0 : (lv - lb) / (lt - lb);
    } else {
      frac = yTop === yBottom ? 0 : (value - yBottom) / (yTop - yBottom);
    }
    frac = Math.min(1, Math.max(0, frac));
    return padTop + plotH - frac * plotH;
  };
  const yTickValues = [];
  for (let i = 0; i <= yTickCount; i++) {
    const f = i / yTickCount;
    yTickValues.push(
      yScale === "log" ? yBottom * Math.pow(yTop / yBottom, f) : yBottom + (yTop - yBottom) * f
    );
  }
  let grid = "";
  yTickValues.forEach((v, i) => {
    const y = r2(yOf(v));
    grid += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="${surf.grid}" stroke-width="1" ${i === 0 ? "" : 'stroke-dasharray="3 3"'} />`;
    grid += `<text x="${padLeft - 10}" y="${y + 3.5}" text-anchor="end" font-size="11" fill="${surf.muted}" font-family="${fontStack}">${esc(formatCount(Math.round(v)))}</text>`;
  });
  let xLabels = "";
  const xTickText = [];
  const xTickX = [];
  if (hasDates) {
    for (let i = 0; i < xTickCount; i++) {
      const t = tMin + (tMax - tMin) * i / (xTickCount - 1);
      const iso = new Date(t).toISOString();
      xTickText.push(dateLabel(iso));
      xTickX.push(r2(xOfDate(iso)));
    }
  } else {
    const rep = series.reduce((a, b) => b.points.length > a.points.length ? b : a, series[0] ?? { points: [] });
    const n = rep.points.length;
    const ticks = Math.min(xTickCount, Math.max(1, n));
    const idxs = ticks <= 1 ? [0] : [...new Set(Array.from({ length: ticks }, (_, k) => Math.round(k * (n - 1) / (ticks - 1))))];
    idxs.forEach((i) => {
      const p = rep.points[i];
      xTickText.push(p?.label ?? String(i + 1));
      xTickX.push(r2(xOfIndex(i, n)));
    });
  }
  xTickText.forEach((txt, i) => {
    const anchor = xTickText.length === 1 ? "middle" : i === 0 ? "start" : i === xTickText.length - 1 ? "end" : "middle";
    xLabels += `<text x="${xTickX[i]}" y="${padTop + plotH + 22}" text-anchor="${anchor}" font-size="11" fill="${surf.muted}" font-family="${fontStack}">${esc(txt)}</text>`;
  });
  let defs = "";
  let seriesSvg = "";
  series.forEach((s, si) => {
    const pts = hasDates ? [...s.points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : s.points;
    if (pts.length === 0) return;
    const coords = pts.map((p, i) => ({
      x: r2(hasDates ? xOfDate(p.date) : xOfIndex(i, pts.length)),
      y: r2(yOf(p.value))
    }));
    const lineD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" ");
    if (area) {
      const gid = `chartFill${si}`;
      const fillColor = s.fill ?? s.color;
      defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${rgba(fillColor, 0.35)}" />
        <stop offset="100%" stop-color="${rgba(fillColor, 0)}" />
      </linearGradient>`;
      const baseY = r2(padTop + plotH);
      const areaD = `${lineD} L${coords[coords.length - 1].x} ${baseY} L${coords[0].x} ${baseY} Z`;
      seriesSvg += `<path d="${areaD}" fill="url(#${gid})" />`;
    }
    seriesSvg += `<path d="${lineD}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
    const last = coords[coords.length - 1];
    seriesSvg += `<circle cx="${last.x}" cy="${last.y}" r="3.5" fill="${s.color}" stroke="${dotHalo}" stroke-width="2" />`;
  });
  let legend = "";
  if (series.length > 1) {
    let lx = padLeft;
    const ly = padTop - 16;
    series.forEach((s) => {
      legend += `<rect x="${lx}" y="${ly - 8}" width="10" height="10" rx="2" fill="${s.color}" />`;
      legend += `<text x="${lx + 16}" y="${ly + 1}" font-size="12" fill="${surf.muted}" font-family="${fontStack}">${esc(s.label)}</text>`;
      lx += 24 + s.label.length * 7;
    });
  }
  let watermark = "";
  if (cfg.logo !== false) {
    const logoSize = 20;
    const wmColor = cfg.logoColor ?? surf.muted;
    const logoX = width - padRight - logoSize;
    const logoY = 14;
    const logoCenterY = logoY + logoSize / 2;
    const textRight = logoX - 6;
    const logoGlyph = `<g transform="translate(${logoX}, ${logoY}) scale(${r2(logoSize / 1600)})" fill="${wmColor}">${SHIELDCN_LOGO}</g>`;
    const wordmark = `<text x="${textRight}" y="${r2(logoCenterY + 4)}" text-anchor="end" font-size="12" font-weight="500" fill="${wmColor}" font-family="${fontStack}">shieldcn.dev</text>`;
    watermark = `<g fill-opacity="0.65">${wordmark}${logoGlyph}</g>`;
  }
  let titleX = padLeft;
  let titleIconSvg = "";
  const ti = cfg.titleIcon;
  if (ti && (ti.path || ti.paths && ti.paths.length)) {
    const iconSize = 26;
    const vb = (ti.viewBox || "0 0 24 24").split(/\s+/).map(Number);
    const vbW = vb[2] && vb[2] > 0 ? vb[2] : 24;
    const scale = r2(iconSize / vbW);
    const iconY = cfg.subtitle ? 17 : 13;
    const pathSvg = ti.paths && ti.paths.length ? ti.paths.map((d) => `<path d="${d}" />`).join("") : `<path d="${ti.path}" />`;
    const iconColor = cfg.titleIconColor ?? surf.fg;
    const paint = ti.isStroke ? `fill="none" stroke="${iconColor}" stroke-width="${ti.strokeWidth ?? 2}" stroke-linecap="${ti.strokeLinecap ?? "round"}" stroke-linejoin="${ti.strokeLinejoin ?? "round"}"` : `fill="${iconColor}"${ti.fillRule ? ` fill-rule="${ti.fillRule}"` : ""}`;
    titleIconSvg = `<g transform="translate(${padLeft}, ${iconY}) scale(${scale})" ${paint}>${pathSvg}</g>`;
    titleX = padLeft + iconSize + 10;
  }
  const title = `<text x="${titleX}" y="30" font-size="16" font-weight="600" fill="${surf.fg}" font-family="${fontStack}">${esc(cfg.title)}</text>`;
  const subtitle = cfg.subtitle ? `<text x="${titleX}" y="48" font-size="12" fill="${surf.muted}" font-family="${fontStack}">${esc(cfg.subtitle)}</text>` : "";
  const body = `
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="${cardBg}" stroke="${showBorder ? surf.border : "none"}" stroke-width="1" />
  ${grid}
  ${xLabels}
  ${seriesSvg}
  ${legend}
  ${titleIconSvg}
  ${title}
  ${subtitle}
  ${watermark}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(cfg.title)}">
  <defs>${defs}</defs>
  ${body}
</svg>`;
  return svg;
}

// src/starhistory.ts
var MAX_POINTS = 30;
var MAX_PAGE = 400;
async function ghFetch(url, token, accept) {
  const res = await fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      "User-Agent": "shieldcn-starchart-action",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (res.status === 403 || res.status === 429) {
    throw new Error(
      `GitHub rate limited the request (${res.status}). Remaining: ${res.headers.get("x-ratelimit-remaining") ?? "?"}`
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub request failed (${res.status}): ${url}`);
  }
  return res;
}
async function fetchStarPage(owner, repo, token, page) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers?per_page=100&page=${page}`;
  const res = await ghFetch(url, token, "application/vnd.github.v3.star+json");
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json.map((s) => s.starred_at).filter((d) => typeof d === "string");
}
function evenSpread(start, end, count) {
  if (count <= 1) return [start];
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round(start + (end - start) * i / (count - 1)));
  }
  return [...new Set(out)];
}
async function getStarHistory(owner, repo, token) {
  const repoRes = await ghFetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
    "application/vnd.github.v3+json"
  );
  const meta = await repoRes.json();
  const total = typeof meta.stargazers_count === "number" ? meta.stargazers_count : 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (total <= 0) {
    return { owner, repo, total: 0, points: [{ date: now, value: 0 }] };
  }
  const pages = Math.min(MAX_PAGE, Math.max(1, Math.ceil(total / 100)));
  if (pages <= MAX_POINTS) {
    const pageNums = evenSpread(1, pages, pages);
    const results2 = await Promise.all(
      pageNums.map((p) => fetchStarPage(owner, repo, token, p))
    );
    const dates = results2.flat();
    if (dates.length === 0) {
      return { owner, repo, total, points: [{ date: now, value: total }] };
    }
    dates.sort();
    const idxs = evenSpread(0, dates.length - 1, Math.min(MAX_POINTS, dates.length));
    const points2 = idxs.map((i) => ({ date: dates[i], value: i + 1 }));
    if (points2[points2.length - 1].value !== total) {
      points2.push({ date: now, value: total });
    }
    return { owner, repo, total, points: points2 };
  }
  const sampledPages = evenSpread(1, pages, MAX_POINTS);
  const results = await Promise.all(
    sampledPages.map(async (p) => {
      const r = await fetchStarPage(owner, repo, token, p);
      if (r.length === 0) return null;
      r.sort();
      return { page: p, date: r[0] };
    })
  );
  const points = [];
  for (const r of results) {
    if (!r) continue;
    points.push({ date: r.date, value: (r.page - 1) * 100 });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  points.push({ date: now, value: total });
  return { owner, repo, total, points };
}

// src/main.ts
function getInput(name, fallback = "") {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return (process.env[key] ?? fallback).trim() || fallback;
}
function getBoolInput(name, fallback) {
  const raw = getInput(name);
  if (!raw) return fallback;
  return raw !== "false" && raw !== "0" && raw !== "no";
}
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  if (value.includes("\n")) {
    (0, import_node_fs.appendFileSync)(file, `${name}<<SHIELDCN_EOF
${value}
SHIELDCN_EOF
`);
  } else {
    (0, import_node_fs.appendFileSync)(file, `${name}=${value}
`);
  }
}
function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}
var GITHUB_MARK = {
  viewBox: "0 0 24 24",
  path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
};
function clampNum(raw, min, max, fallback) {
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function renderStarChart(opts) {
  return renderChart({
    title: opts.title,
    subtitle: opts.subtitle,
    series: opts.series,
    width: opts.width,
    height: opts.height,
    mode: opts.mode,
    area: opts.area,
    background: opts.background,
    border: opts.border,
    fontFamily: opts.fontFamily,
    logo: opts.logo,
    link: opts.link,
    titleIcon: GITHUB_MARK
  });
}
function git(args) {
  return (0, import_node_child_process.execFileSync)("git", args, { encoding: "utf8" }).trim();
}
function commitFiles(paths, message) {
  git(["add", ...paths]);
  const staged = git(["diff", "--cached", "--name-only", "--", ...paths]);
  if (!staged) {
    console.log("Star chart unchanged \u2014 nothing to commit.");
    return false;
  }
  git([
    "-c",
    "user.name=shieldcn[bot]",
    "-c",
    "user.email=shieldcn[bot]@users.noreply.github.com",
    "commit",
    "-m",
    message
  ]);
  git(["push"]);
  return true;
}
async function run() {
  const repoInput = getInput("repo", process.env.GITHUB_REPOSITORY ?? "");
  const [owner, repo] = repoInput.split("/");
  if (!owner || !repo) fail(`Invalid repo "${repoInput}" \u2014 expected "owner/repo".`);
  const token = getInput("token", process.env.GITHUB_TOKEN ?? "");
  if (!token) fail("No GitHub token. Pass `token:` or expose GITHUB_TOKEN.");
  const modeInput = getInput("mode", "both");
  if (!["dark", "light", "both"].includes(modeInput)) {
    fail(`Invalid mode "${modeInput}" \u2014 expected dark, light, or both.`);
  }
  const modes = modeInput === "both" ? ["dark", "light"] : [modeInput];
  const output = getInput("output", ".github/shieldcn/star-chart.svg");
  if (!output.endsWith(".svg")) fail(`Output "${output}" must end in .svg`);
  const width = clampNum(getInput("width"), 200, 2e3, 800);
  const height = clampNum(getInput("height"), 120, 1200, 400);
  const area = getBoolInput("area", true);
  const border = getBoolInput("border", true);
  const logo = getBoolInput("logo", true);
  const accent = resolveAccent(getInput("theme") || null, getInput("color") || null);
  const fontFamily = resolveFontFamily(getInput("font") || null);
  const bgInput = getInput("background");
  const background = bgInput === "transparent" || bgInput === "none" ? "transparent" : /^[0-9a-fA-F]{6}$/.test(bgInput.replace("#", "")) ? `#${bgInput.replace("#", "")}` : void 0;
  console.log(`Fetching star history for ${owner}/${repo}\u2026`);
  const history = await getStarHistory(owner, repo, token);
  console.log(`Total stars: ${history.total} (${history.points.length} points)`);
  const link = `https://github.com/${owner}/${repo}/stargazers`;
  const title = getInput("title", `${owner}/${repo}`);
  const subtitle = getInput(
    "subtitle",
    `${formatCount(history.total)} stars`
  );
  const series = [
    { label: "stars", points: history.points, color: accent }
  ];
  const files = [];
  for (const mode of modes) {
    const path = modeInput === "both" ? output.replace(/\.svg$/, `-${mode}.svg`) : output;
    const svg = renderStarChart({
      mode,
      title,
      subtitle,
      series,
      width,
      height,
      area,
      background,
      border,
      fontFamily,
      logo,
      link
    });
    (0, import_node_fs.mkdirSync)((0, import_node_path.dirname)((0, import_node_path.join)(process.cwd(), path)), { recursive: true });
    (0, import_node_fs.writeFileSync)(path, svg);
    console.log(`Wrote ${path}`);
    files.push(path);
  }
  setOutput("files", files.join("\n"));
  setOutput("stars", String(history.total));
  if (modeInput === "both") {
    const [darkFile, lightFile] = files;
    setOutput(
      "snippet",
      [
        "<picture>",
        `  <source media="(prefers-color-scheme: dark)" srcset="${darkFile}">`,
        `  <img alt="Star history of ${owner}/${repo}" src="${lightFile}">`,
        "</picture>"
      ].join("\n")
    );
  } else {
    setOutput("snippet", `<img alt="Star history of ${owner}/${repo}" src="${files[0]}">`);
  }
  if (getBoolInput("commit", true)) {
    const message = getInput(
      "commit-message",
      "chore: update star chart [skip ci]"
    );
    const committed = commitFiles(files, message);
    setOutput("committed", String(committed));
  } else {
    setOutput("committed", "false");
  }
}
run().catch((err) => fail(err instanceof Error ? err.message : String(err)));
