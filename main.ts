// The World Today — Tuesday 24 November 2026
// A one-day newspaper front page, drawn with pure Node 22 stdlib.
// Renders a deterministic 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png
// (default: out/entry.png). No network, no fonts, no dependencies:
// a hand-drawn 5x7 pixel font and a small zlib PNG encoder.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const PAPER = [247, 243, 232];
const INK = [26, 26, 26];
const RED = [178, 34, 34];
const BLUE = [30, 64, 120];
const GREY = [110, 104, 90];
const SKY = [214, 228, 238];
const GREEN = [34, 120, 60];

// ---------------------------------------------------------------- font ----
// 5x7 pixel capitals, digits and punctuation. Every glyph is 7 rows of 5
// bits ("#" = ink). All page text is set in capitals, so no lowercase
// glyphs are needed.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};

// ------------------------------------------------------------- canvas ----
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}
function setPix(x: number, y: number, c: number[]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) setPix(i, j, c);
}
function hline(x: number, y: number, w: number, t: number, c: number[]) {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, t: number, c: number[]) {
  rect(x, y, t, h, c);
}
function box(x: number, y: number, w: number, h: number, c: number[]) {
  hline(x, y, w, 2, c);
  hline(x, y + h - 2, w, 2, c);
  vline(x, y, h, 2, c);
  vline(x + w - 2, y, h, 2, c);
}
function circle(cx: number, cy: number, r: number, c: number[]) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPix(x, y, c);
    }
}
function line(x0: number, y0: number, x1: number, y1: number, t: number, c: number[]) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let s = 0; s <= n; s++) {
    const x = Math.round(x0 + (dx * s) / n);
    const y = Math.round(y0 + (dy * s) / n);
    for (let a = 0; a < t; a++)
      for (let b = 0; b < t; b++) setPix(x + a, y + b, c);
  }
}

// -------------------------------------------------------------- text -----
function textWidth(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function drawText(s: string, x: number, y: number, sc: number, c: number[]) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = GLYPHS[ch] || GLYPHS[" "];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1")
          rect(cx + col * sc, y + r * sc, sc, sc, c);
    cx += 6 * sc;
  }
}
function drawCentered(s: string, cx: number, y: number, sc: number, c: number[]) {
  drawText(s, cx - Math.floor(textWidth(s, sc) / 2), y, sc, c);
}
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function para(s: string, x: number, y: number, w: number, sc: number, lh: number, c: number[]): number {
  const lines = wrap(s, Math.floor(w / (6 * sc)));
  lines.forEach((ln, i) => drawText(ln, x, y + i * lh, sc, c));
  return y + lines.length * lh;
}

// --------------------------------------------------------------- png -----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ============================================================ content ====
// All 20 stories happened, or were first reported, on Tuesday 24 Nov 2026.
// Sources are listed in BUILD_NOTES.md.
const DATE = "TUESDAY 24 NOVEMBER 2026";

const LEADS = [
  {
    kicker: "UKRAINE WAR",
    head: "RUSSIA HITS ZAPORIZHZHIA: 2 KILLED, 22 HURT",
    body: "Overnight strikes partly destroyed a five-storey block in the Kosmichnyi district, officials said. Two children were among the 22 hurt as a new drone wave swept Ukraine.",
    art: "zaporizhzhia",
  },
  {
    kicker: "MARKETS",
    head: "ASIA RIDES THE AI RALLY AS HUANG RETURNS",
    body: "Seoul jumped 7.5% and Taipei 9.1% on Tuesday as Nvidia's return of Jensen Huang as chief revived the battered AI trade. Wall Street had soared on Monday.",
    art: "markets",
  },
];

const MIDS = [
  {
    kicker: "NATO",
    head: "MOSCOW WARNS ESTONIA OF 'OPEN WAR'",
    body: "Russia summoned Estonia's envoy after Tallinn said it will shut its border crossings from 1 December, accusing Moscow of trying to set fire to a defence firm.",
  },
  {
    kicker: "SPACE",
    head: "GERMANY EYES 'NUCLEAR SATELLITE' REPORTS",
    body: "Berlin says it takes seriously reports that Russia may launch a nuclear-armed satellite, Sputnik-S, into orbit this year. Moscow calls the claims unfounded.",
  },
  {
    kicker: "EARTHQUAKE",
    head: "5.6 QUAKE SHAKES EAST NEPAL",
    body: "A magnitude 5.6 tremor struck near the Tibet border on Tuesday morning, felt in Kathmandu and across northern India. No casualties were reported.",
  },
];

const BRIEFS = [
  {
    head: "LIBYA SEEKS ANSWERS",
    body: "Tripoli demanded explanations from Kyiv and the UN sought a probe after Ukraine's sea drones sank a Russian corvette at Benghazi.",
  },
  {
    head: "GAZA STRIKES KILL THREE",
    body: "Israeli strikes in Gaza killed at least three people, including an UNRWA worker, Al Jazeera reported.",
  },
  {
    head: "24 DEAD IN FACTORY FIRE",
    body: "Indonesia confirmed 24 dead in a candy factory blaze in Banten, with about 30 workers still missing as rescuers search the wreckage.",
  },
  {
    head: "TRUMP WARNS IRAN",
    body: "President Trump warned of a 'very traumatic' outcome if no nuclear deal is reached, and weighs sending a second aircraft carrier.",
  },
  {
    head: "TYPHOID JABS FOR 50M",
    body: "Bangladesh began a month-long campaign to vaccinate 50 million children against drug-resistant typhoid.",
  },
  {
    head: "COP31: BLAME GAME GOES ON",
    body: "After the Antalya summit collapsed with no deal, critics called it climate diplomacy's 'darkest moment' over fossil-fuel wording.",
  },
];

const ALSO = [
  "KYIV-BERLIN MISSILE DEAL",
  "DRONE STRAYS INTO POLAND",
  "PATRIOT DELIVERY DELAYED",
  "ZELENSKYY: LET US INTO NATO",
  "490,000 RUSSIAN DEAD: LEAK",
  "PAKISTAN JOINS TIANGONG",
  "SOFTBANK PUTS $2BN IN INTEL",
  "INDIA-NZ TEST ENDS IN DRAW",
  "CAR BOMB HITS COLOMBIA",
];

// ============================================================= layout ====
const M = 24; // margin
const COLW = (W - 2 * M - 16) / 2; // lead/brief column width

// ---- masthead ----
hline(M, 8, W - 2 * M, 3, INK);
hline(M, 14, W - 2 * M, 1, INK);
drawCentered("THE WORLD TODAY", W / 2, 24, 7, INK);
drawCentered(DATE, W / 2, 82, 2, RED);
drawCentered("ONE DAY. THE WHOLE WORLD. IN ONE PAGE.", W / 2, 100, 1, GREY);
hline(M, 116, W - 2 * M, 3, INK);

// ---- lead illustration panels (stylised drawings, never photos) ----
function drawArt(kind: string, x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY);
  box(x, y, w, h, INK);
  if (kind === "zaporizhzhia") {
    // night sky, damaged tower block, smoke, rescue light
    rect(x, y, w, 60, [38, 52, 78]);
    circle(x + 52, y + 30, 12, [232, 226, 200]);
    // tower blocks
    rect(x + 30, y + 78, 70, h - 78, [58, 58, 64]);
    rect(x + 120, y + 62, 70, h - 62, [80, 76, 70]);
    rect(x + 210, y + 92, 70, h - 92, [58, 58, 64]);
    rect(x + 300, y + 70, 70, h - 70, [72, 68, 62]);
    // windows
    for (let wy = y + 72; wy < y + h - 14; wy += 18)
      for (let wx = x + 40; wx < x + w - 40; wx += 26)
        rect(wx, wy, 10, 8, [240, 200, 90]);
    // cracked, leaning top of the hit block
    line(x + 120, y + 62, x + 150, y + 96, 3, INK);
    line(x + 190, y + 62, x + 160, y + 96, 3, INK);
    // smoke puffs rising from the hit block
    circle(x + 155, y + 46, 14, [200, 200, 196]);
    circle(x + 138, y + 34, 10, [214, 214, 210]);
    circle(x + 172, y + 30, 9, [226, 226, 222]);
    // small drone dot
    rect(x + w - 66, y + 26, 10, 4, INK);
    rect(x + w - 70, y + 22, 18, 2, INK);
  } else {
    // markets: rising chart, green bars, chip
    rect(x, y, w, h, [238, 244, 232]);
    // bars
    const bars = [34, 48, 40, 62, 78, 70, 96, 118];
    bars.forEach((bh, i) => {
      rect(x + 30 + i * 34, y + h - 30 - bh, 22, bh, i === bars.length - 1 ? GREEN : [120, 160, 120]);
    });
    // rising arrow line
    line(x + 30, y + h - 52, x + 120, y + h - 84, 4, GREEN);
    line(x + 120, y + h - 84, x + 210, y + h - 70, 4, GREEN);
    line(x + 210, y + h - 70, x + 300, y + h - 118, 4, GREEN);
    line(x + 300, y + h - 118, x + 392, y + h - 150, 4, GREEN);
    // arrowhead
    line(x + 392, y + h - 150, x + 372, y + h - 146, 4, GREEN);
    line(x + 392, y + h - 150, x + 386, y + h - 130, 4, GREEN);
    // chip
    rect(x + w - 96, y + 18, 72, 44, INK);
    drawText("AI", x + w - 78, y + 28, 2, [247, 243, 232]);
    rect(x + w - 96, y + 62, 72, 4, GREEN);
  }
  // caption strip on a paper patch so it stays legible over dark art
  const cap = "ILLUSTRATION";
  rect(x + 4, y + h - 26, textWidth(cap, 1) + 10, 15, PAPER);
  drawText(cap, x + 9, y + h - 24, 1, GREY);
}

// ---- leads ----
let leadTop = 128;
const ART_H = 152;
const leadHeights: number[] = [];
LEADS.forEach((L, i) => {
  const x = M + i * (COLW + 16);
  drawArt(L.art, x, leadTop, COLW, ART_H);
  let y = leadTop + ART_H + 12;
  drawText(L.kicker, x, y, 2, RED);
  y += 18;
  const headLines = wrap(L.head, Math.floor(COLW / 18));
  headLines.forEach((ln) => {
    drawText(ln, x, y, 3, INK);
    y += 24;
  });
  y += 2;
  y = para(L.body, x, y, COLW, 2, 16, INK);
  leadHeights.push(y - leadTop);
});
const leadBottom = leadTop + Math.max(...leadHeights) + 8;
hline(M, leadBottom, W - 2 * M, 2, INK);

// ---- mid stories: 3 columns (integer widths: fractional x scrambles RGB channels) ----
const midTop = leadBottom + 12;
const MIDW = Math.floor((W - 2 * M - 2 * 16) / 3);
const midHeights: number[] = [];
MIDS.forEach((S, i) => {
  const x = M + i * (MIDW + 16);
  drawText(S.kicker, x, midTop, 2, RED);
  let y = midTop + 18;
  const hl = wrap(S.head, Math.floor(MIDW / 12));
  hl.forEach((ln) => {
    drawText(ln, x, y, 2, INK);
    y += 15;
  });
  y += 4;
  y = para(S.body, x, y, MIDW, 2, 14, INK);
  midHeights.push(y - midTop);
});
const midBottom = midTop + Math.max(...midHeights) + 8;
hline(M, midBottom, W - 2 * M, 2, INK);

// ---- in brief: 2 columns x 3 rows, rows sized from wrapped lines ----
let briefY = midBottom + 10;
drawText("IN BRIEF", M, briefY, 2, INK);
hline(M + textWidth("IN BRIEF", 2) + 10, briefY + 6, W - 2 * M - textWidth("IN BRIEF", 2) - 10, 2, INK);
briefY += 24;
for (let r = 0; r < 3; r++) {
  let rowH = 0;
  for (let c = 0; c < 2; c++) {
    const B = BRIEFS[r * 2 + c];
    const x = M + c * (COLW + 16);
    const hl = wrap(B.head, Math.floor(COLW / 12));
    const bl = wrap(B.body, Math.floor(COLW / 12));
    let y = briefY;
    hl.forEach((ln) => {
      drawText(ln, x, y, 2, INK);
      y += 15;
    });
    y += 3;
    bl.forEach((ln) => {
      drawText(ln, x, y, 2, [64, 60, 52]);
      y += 14;
    });
    rowH = Math.max(rowH, y - briefY);
  }
  briefY += rowH + 8;
  if (r < 2) hline(M, briefY - 4, W - 2 * M, 1, [200, 192, 176]);
}
const briefBottom = briefY;
hline(M, briefBottom, W - 2 * M, 2, INK);

// ---- also today: 3 columns x 3 rows ----
let alsoY = briefBottom + 10;
drawText("ALSO TODAY", M, alsoY, 2, INK);
hline(M + textWidth("ALSO TODAY", 2) + 10, alsoY + 6, W - 2 * M - textWidth("ALSO TODAY", 2) - 10, 2, INK);
alsoY += 24;
const ALSOW = Math.floor((W - 2 * M - 2 * 16) / 3);
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    const x = M + c * (ALSOW + 16);
    const t = ALSO[r * 3 + c];
    rect(x, alsoY + 4, 6, 6, RED);
    drawText(t, x + 12, alsoY, 2, INK);
  }
  alsoY += 17;
}
const alsoBottom = alsoY + 4;
hline(M, alsoBottom, W - 2 * M, 2, INK);

// ---- footer ----
drawCentered("THE WORLD TODAY - " + DATE, W / 2, alsoBottom + 8, 1, GREY);

// -------------------------------------------------------------- write ----
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outDir + "/entry.png", encodePNG());
console.log("wrote " + outDir + "/entry.png");
