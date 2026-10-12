"use client";
import { useMemo, useRef, useState } from "react";
import { CANVAS, descendantsOf, toLuau, type ElClass, type UiEl, type Units } from "@/lib/uiToLuau";
import CopyButton from "./CopyButton";

const CLASSES: [ElClass, string][] = [["Frame", "Frame"], ["TextLabel", "Label"], ["TextButton", "Tombol"], ["TextBox", "Kotak teks"], ["ImageLabel", "Gambar"]];
const inp = "w-full border border-white/30 bg-black px-2 py-1 text-sm outline-none focus:border-gold";
let seq = 1;

const make = (cls: ElClass, parent: string | null): UiEl => ({
  id: `e${seq++}`, parent, cls, name: `${cls}${seq - 1}`, x: 20, y: 20,
  w: cls === "TextLabel" ? 160 : 140, h: cls === "Frame" ? 120 : 40,
  bg: cls === "Frame" ? "#1a1a1a" : "#ffffff", bgT: cls === "TextLabel" ? 1 : 0,
  text: cls === "Frame" || cls === "ImageLabel" ? "" : cls === "TextBox" ? "Ketik di sini" : "Teks",
  textColor: cls === "TextLabel" ? "#ffffff" : "#000000", textSize: 18, radius: 6, strokeColor: "#ffffff", strokeW: 0,
  image: "rbxassetid://0", z: 0,
});

export default function UiConverter() {
  const [els, setEls] = useState<UiEl[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [units, setUnits] = useState<Units>("offset");
  const [guiName, setGuiName] = useState("MyUI");
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; a: number; b: number } | null>(null);

  const cur = els.find((e) => e.id === sel) ?? null;
  const code = useMemo(() => toLuau(els, units, guiName || "MyUI"), [els, units, guiName]);
  const patch = (id: string, p: Partial<UiEl>) => setEls((l) => l.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  function add(cls: ElClass) {
    const parent = cur && cur.cls === "Frame" ? cur.id : null;
    const e = make(cls, parent); setEls((l) => [...l, e]); setSel(e.id);
  }
  function remove() {
    if (!cur) return;
    const gone = descendantsOf(els, cur.id); gone.add(cur.id);
    setEls((l) => l.filter((e) => !gone.has(e.id))); setSel(null);
  }

  function down(e: React.PointerEvent, el: UiEl, mode: "move" | "resize") {
    e.stopPropagation(); e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSel(el.id);
    drag.current = { id: el.id, mode, sx: e.clientX, sy: e.clientY, a: mode === "move" ? el.x : el.w, b: mode === "move" ? el.y : el.h };
  }
  function move(e: React.PointerEvent, el: UiEl) {
    const d = drag.current; if (!d || d.id !== el.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    patch(el.id, d.mode === "move" ? { x: Math.round(d.a + dx), y: Math.round(d.b + dy) } : { w: Math.max(8, Math.round(d.a + dx)), h: Math.max(8, Math.round(d.b + dy)) });
  }

  const render = (parent: string | null): React.ReactNode =>
    els.filter((e) => e.parent === parent).map((el) => (
      <div
        key={el.id}
        onPointerDown={(e) => down(e, el, "move")} onPointerMove={(e) => move(e, el)} onPointerUp={() => (drag.current = null)}
        style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, backgroundColor: `${el.bg}${Math.round((1 - el.bgT) * 255).toString(16).padStart(2, "0")}`, borderRadius: el.radius, boxShadow: el.strokeW ? `inset 0 0 0 ${el.strokeW}px ${el.strokeColor}` : undefined, color: el.textColor, fontSize: el.textSize, zIndex: el.z, touchAction: "none", cursor: "move" }}
        className={`flex items-center justify-center overflow-visible text-center font-medium ${sel === el.id ? "outline outline-2 outline-dashed outline-[#D4AF37]" : ""}`}
      >
        {el.cls !== "Frame" && el.cls !== "ImageLabel" && <span className="pointer-events-none truncate px-1">{el.text}</span>}
        {el.cls === "ImageLabel" && <span className="pointer-events-none text-xs opacity-60">gambar</span>}
        {render(el.id)}
        {sel === el.id && <span onPointerDown={(e) => down(e, el, "resize")} onPointerMove={(e) => move(e, el)} onPointerUp={() => (drag.current = null)} style={{ touchAction: "none" }} className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize bg-gold" />}
      </div>
    ));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {CLASSES.map(([c, l]) => <button key={c} onClick={() => add(c)} className="border border-white/40 px-3 py-1.5 text-sm hover:bg-gold hover:text-black">+ {l}</button>)}
          <button onClick={remove} disabled={!cur} className="ml-auto border border-white/40 px-3 py-1.5 text-sm disabled:opacity-30">Hapus</button>
        </div>
        <p className="text-xs text-white/50">Klik "+ Frame" lalu tambah elemen saat Frame terpilih untuk menaruhnya di dalam Frame. Seret untuk memindah, tarik kotak biru untuk mengubah ukuran. Kanvas {CANVAS.w}×{CANVAS.h}.</p>
        <div className="overflow-auto">
          <div onPointerDown={() => setSel(null)} style={{ width: CANVAS.w, height: CANVAS.h, backgroundImage: "linear-gradient(#222 1px,transparent 1px),linear-gradient(90deg,#222 1px,transparent 1px)", backgroundSize: "20px 20px" }} className="relative border border-white/40 bg-black">
            {render(null)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Kode Luau</h2>
            <select value={units} onChange={(e) => setUnits(e.target.value as Units)} className="border border-white/30 bg-black px-2 py-1 text-sm">
              <option value="offset">Ukuran piksel (Offset)</option><option value="scale">Ukuran relatif (Scale)</option>
            </select>
            <input value={guiName} onChange={(e) => setGuiName(e.target.value)} aria-label="Nama ScreenGui" className={`${inp} max-w-[10rem]`} />
            <span className="ml-auto"><CopyButton getText={() => code} /></span>
          </div>
          <textarea readOnly value={code} spellCheck={false} aria-label="Kode Luau" className="h-72 w-full resize-none border border-white/30 bg-black p-3 font-mono text-sm outline-none" />
        </div>
      </div>

      <aside className="space-y-3 border border-gold/25 p-4 text-sm">
        <h2 className="text-lg font-semibold">Properti</h2>
        {!cur ? <p className="text-white/60">Pilih elemen di kanvas.</p> : (
          <>
            <label className="grid gap-1">Nama<input className={inp} value={cur.name} onChange={(e) => patch(cur.id, { name: e.target.value })} /></label>
            <label className="grid gap-1">Parent
              <select className={inp} value={cur.parent ?? ""} onChange={(e) => patch(cur.id, { parent: e.target.value || null })}>
                <option value="">ScreenGui</option>
                {els.filter((p) => p.cls === "Frame" && p.id !== cur.id && !descendantsOf(els, cur.id).has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "w", "h"] as const).map((k) => <label key={k} className="grid gap-1">{k.toUpperCase()}<input type="number" className={inp} value={cur[k]} onChange={(e) => patch(cur.id, { [k]: num(e.target.value) })} /></label>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">Warna<input type="color" className="h-8 w-full bg-black" value={cur.bg} onChange={(e) => patch(cur.id, { bg: e.target.value })} /></label>
              <label className="grid gap-1">Transparansi<input type="number" min={0} max={1} step={0.1} className={inp} value={cur.bgT} onChange={(e) => patch(cur.id, { bgT: Math.min(1, Math.max(0, num(e.target.value))) })} /></label>
              <label className="grid gap-1">Sudut<input type="number" min={0} className={inp} value={cur.radius} onChange={(e) => patch(cur.id, { radius: num(e.target.value) })} /></label>
              <label className="grid gap-1">ZIndex<input type="number" className={inp} value={cur.z} onChange={(e) => patch(cur.id, { z: num(e.target.value) })} /></label>
              <label className="grid gap-1">Garis tepi<input type="number" min={0} className={inp} value={cur.strokeW} onChange={(e) => patch(cur.id, { strokeW: num(e.target.value) })} /></label>
              <label className="grid gap-1">Warna garis<input type="color" className="h-8 w-full bg-black" value={cur.strokeColor} onChange={(e) => patch(cur.id, { strokeColor: e.target.value })} /></label>
            </div>
            {(cur.cls === "TextLabel" || cur.cls === "TextButton" || cur.cls === "TextBox") && (
              <>
                <label className="grid gap-1">{cur.cls === "TextBox" ? "Placeholder" : "Teks"}<input className={inp} value={cur.text} onChange={(e) => patch(cur.id, { text: e.target.value })} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">Warna teks<input type="color" className="h-8 w-full bg-black" value={cur.textColor} onChange={(e) => patch(cur.id, { textColor: e.target.value })} /></label>
                  <label className="grid gap-1">Ukuran teks<input type="number" min={8} className={inp} value={cur.textSize} onChange={(e) => patch(cur.id, { textSize: num(e.target.value) })} /></label>
                </div>
              </>
            )}
            {cur.cls === "ImageLabel" && <label className="grid gap-1">Image ID<input className={inp} value={cur.image} onChange={(e) => patch(cur.id, { image: e.target.value })} /></label>}
          </>
        )}
      </aside>
    </div>
  );
}
