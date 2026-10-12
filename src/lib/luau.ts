/**
 * Beautifier & Minifier Luau berbasis tokenizer (bukan regex mentah),
 * sehingga isi string, long-string [[ ]] dan komentar tidak ikut rusak.
 * Berjalan 100% di browser.
 */
type TokType = "nl" | "comment" | "string" | "number" | "word" | "op";
export interface Tok { t: TokType; v: string; unary?: boolean; ann?: boolean; expr?: boolean }

const KEYWORDS = new Set(["and","break","do","else","elseif","end","false","for","function","if","in","local","nil","not","or","repeat","return","then","true","until","while"]);
const OPS3 = ["...", "..=", "//="];
const OPS2 = ["==", "~=", "<=", ">=", "..", "//", "+=", "-=", "*=", "/=", "%=", "^=", "::", "->"];

function longOpen(s: string, i: number) {
  if (s[i] !== "[") return null;
  let j = i + 1, level = 0;
  while (s[j] === "=") { level++; j++; }
  return s[j] === "[" ? { level, len: j + 1 - i } : null;
}
function longEnd(s: string, from: number, level: number) {
  const close = "]" + "=".repeat(level) + "]";
  const k = s.indexOf(close, from);
  return k < 0 ? s.length : k + close.length;
}

export function tokenize(input: string): Tok[] {
  const src = input.replace(/\r\n?/g, "\n");
  const n = src.length;
  const out: Tok[] = [];
  const numRe = /(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?)/y;
  const wordRe = /[A-Za-z_][A-Za-z0-9_]*/y;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === "\n") { out.push({ t: "nl", v: "\n" }); i++; continue; }
    if (c === " " || c === "\t" || c === "\f" || c === "\v") { i++; continue; }

    if (c === "-" && src[i + 1] === "-") {
      const lo = longOpen(src, i + 2);
      if (lo) { const e = longEnd(src, i + 2 + lo.len, lo.level); out.push({ t: "comment", v: src.slice(i, e) }); i = e; continue; }
      let j = src.indexOf("\n", i); if (j < 0) j = n;
      out.push({ t: "comment", v: src.slice(i, j).replace(/\s+$/, "") }); i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") { if (src[j] === "\\") j++; j++; }
      if (src[j] === c) j++;
      out.push({ t: "string", v: src.slice(i, j) }); i = j; continue;
    }
    if (c === "`") { // Luau interpolated string
      let j = i + 1;
      while (j < n && src[j] !== "`") { if (src[j] === "\\") j++; j++; }
      j = Math.min(j + 1, n);
      out.push({ t: "string", v: src.slice(i, j) }); i = j; continue;
    }
    if (c === "[") {
      const lo = longOpen(src, i);
      if (lo) { const e = longEnd(src, i + lo.len, lo.level); out.push({ t: "string", v: src.slice(i, e) }); i = e; continue; }
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      numRe.lastIndex = i; const m = numRe.exec(src);
      if (m) { out.push({ t: "number", v: m[0] }); i += m[0].length; continue; }
    }
    if (/[A-Za-z_]/.test(c)) {
      wordRe.lastIndex = i; const m = wordRe.exec(src)!;
      out.push({ t: "word", v: m[0] }); i += m[0].length; continue;
    }
    const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
    const op = OPS3.includes(three) ? three : OPS2.includes(two) ? two : c;
    out.push({ t: "op", v: op }); i += op.length;
  }
  return out;
}

/* ----------------------------- MINIFY ----------------------------- */
const wordish = (ch: string) => /[A-Za-z0-9_]/.test(ch);

function needsSep(p: Tok, c: Tok) {
  const a = p.v[p.v.length - 1], b = c.v[0];
  if (wordish(a) && wordish(b)) return true;              // local x, return y, 1 .. 2
  if (p.t === "number" && b === ".") return true;         // 1 ..x
  if (a === "." && (b === "." || /[0-9]/.test(b))) return true;
  if (a === "-" && b === "-") return true;                // a - -b  (hindari jadi komentar)
  if (a === "[" && (b === "[" || b === "=")) return true; // hindari jadi long-string
  if (a === ">" && b === "=") return true;                // generic Array<T> = ... jangan jadi ">="
  return false;
}

export function minify(src: string): string {
  let out = "";
  let prev: Tok | null = null;
  for (const tk of tokenize(src)) {
    if (tk.t === "nl") continue;
    if (tk.t === "comment") {
      // Pertahankan direktif Luau: --!strict, --!nocheck, dst.
      if (tk.v.startsWith("--!")) { out += (out && !out.endsWith("\n") ? "\n" : "") + tk.v + "\n"; prev = null; }
      continue;
    }
    if (prev && needsSep(prev, tk)) out += " ";
    out += tk.v; prev = tk;
  }
  return out.trim();
}

/* ---------------------------- BEAUTIFY ---------------------------- */
const sig = (t: Tok) => t.t !== "comment" && t.t !== "nl";
const isW = (t: Tok | undefined, ...v: string[]) => !!t && t.t === "word" && v.includes(t.v);
const isO = (t: Tok | undefined, ...v: string[]) => !!t && t.t === "op" && v.includes(t.v);

function splitLines(raw: Tok[]): Tok[][] {
  const toks = raw.map((t) => ({ ...t }));
  const lines: Tok[][] = [];
  let cur: Tok[] = [];
  let blank = false, prevRaw: Tok | undefined, braces = 0, pendingExprThen = 0, exprOpen = 0;
  const flush = () => {
    if (!cur.length) return;
    if (blank && lines.length) lines.push([]);
    blank = false; lines.push(cur); cur = [];
  };
  const nextSig = (k: number) => { for (let j = k + 1; j < toks.length; j++) if (toks[j].t !== "nl") return toks[j]; };

  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === "nl") {
      if (cur.length) flush(); else if (prevRaw?.t === "nl") blank = true;
      prevRaw = tk; continue;
    }
    prevRaw = tk;

    if (tk.t === "comment") {
      cur.push(tk);
      if (!tk.v.startsWith("--[") || tk.v.includes("\n")) flush();
      continue;
    }

    const hasContent = cur.some(sig);
    if (tk.t === "op") {
      if (tk.v === "{") braces++;
      if (tk.v === "}") braces--;
    }
    if (tk.t === "word") {
      // if-expression Luau: `x = if a then b else c` -> tanpa indent/pecah baris
      if (tk.v === "if" && hasContent) { tk.expr = true; pendingExprThen++; }
      else if (tk.v === "then" && pendingExprThen > 0) { tk.expr = true; pendingExprThen--; exprOpen++; }
      else if (tk.v === "elseif" && exprOpen > 0) { tk.expr = true; pendingExprThen++; }
      else if (tk.v === "else" && exprOpen > 0) { tk.expr = true; exprOpen--; }

      if (!tk.expr && hasContent && ["end", "else", "elseif", "until", "local", "for", "while", "repeat", "return"].includes(tk.v)) flush();
    }

    cur.push(tk);

    if (tk.t === "word" && !tk.expr && ["then", "do", "else", "repeat"].includes(tk.v)) flush();
    else if (tk.t === "op" && tk.v === ";" && braces === 0) flush();
    else if (isW(tk, "end")) {
      const nx = nextSig(k);
      if (!(nx && isO(nx, ")", ",", "}", "]", ".", ":", ";"))) flush();
    }
  }
  flush();
  return lines;
}

function markUnaryAndAnnotations(line: Tok[]) {
  for (let i = 0; i < line.length; i++) {
    const tk = line[i], p = line.slice(0, i).reverse().find(sig);
    if (tk.t === "op" && (tk.v === "-" || tk.v === "#")) {
      tk.unary = tk.v === "#" || !p || (p.t === "op" && !isO(p, ")", "]", "}")) || isW(p, "return", "and", "or", "not", "in", "then", "do", "else", "elseif", "if", "while", "until");
    }
    if (tk.t === "op" && tk.v === ":") {
      const w = line[i + 1], after = line[i + 2];
      // obj:method(...) / obj:method"x" / obj:method{...}  => pemanggilan method; selain itu anotasi tipe
      const isMethod = w?.t === "word" && !!after && (isO(after, "(", "{") || after.t === "string");
      tk.ann = !isMethod;
    }
  }
}

function space(p: Tok | undefined, c: Tok): boolean {
  if (!p) return false;
  if (c.t === "comment" || p.t === "comment") return true;
  if (p.unary) return false;
  if (p.t === "op" && p.v === ":" && p.ann) return true;
  if (isO(p, "(", "[", "{", ".", ":")) return false;
  if (c.t === "op") {
    if (isO(c, ")", "]", "}", ",", ";", ".", "?")) return false;
    if (c.v === ":") return false;
    if (isO(c, "(", "[", "{")) {
      if (isW(p, "function")) return false;
      if (p.t === "word") return KEYWORDS.has(p.v);        // `if (x)`, `return {`  vs  `print(x)`
      if (p.t === "string" || p.t === "number") return false;
      return !isO(p, ")", "]", "}");                      // `= {`, `, (`, `+ (`
    }
  }
  return true;
}

function renderLine(line: Tok[]): string {
  let s = "", p: Tok | undefined;
  for (const tk of line) { if (space(p, tk)) s += " "; s += tk.v; p = tk; }
  return s;
}

export function beautify(src: string, indentUnit = "\t"): string {
  const lines = splitLines(tokenize(src));
  const out: string[] = [];
  let level = 0;
  for (const line of lines) {
    if (!line.length) { if (out.length && out[out.length - 1] !== "") out.push(""); continue; }
    markUnaryAndAnnotations(line);
    const first = line.find(sig);
    const dedent = first && ((first.t === "word" && !first.expr && ["end", "else", "elseif", "until"].includes(first.v)) || isO(first, ")", "}", "]")) ? 1 : 0;
    out.push(indentUnit.repeat(Math.max(0, level - dedent)) + renderLine(line));
    for (const tk of line) {
      if (tk.t === "word" && !tk.expr) {
        if (["then", "do", "repeat", "function"].includes(tk.v)) level++;
        else if (["end", "until", "elseif"].includes(tk.v)) level--;   // else: -1 lalu +1 = 0
      } else if (tk.t === "op") {
        if (isO(tk, "(", "{", "[")) level++;
        else if (isO(tk, ")", "}", "]")) level--;
      }
      level = Math.max(0, level);
    }
  }
  return out.join("\n").replace(/\n+$/, "") + "\n";
}

export const byteSize = (s: string) => new TextEncoder().encode(s).length;
