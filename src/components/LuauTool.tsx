"use client";
import { useState } from "react";
import { beautify, minify, byteSize } from "@/lib/luau";
import CopyButton from "./CopyButton";

const pane = "h-[26rem] w-full resize-none border border-white/30 bg-black p-3 font-mono text-sm leading-relaxed outline-none focus:border-gold";

export default function LuauTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState("\t");
  const [stat, setStat] = useState("");

  function run(mode: "beautify" | "minify") {
    const out = mode === "beautify" ? beautify(input, indent) : minify(input);
    setOutput(out);
    const a = byteSize(input), b = byteSize(out);
    setStat(mode === "minify" && a ? `${a} B menjadi ${b} B (hemat ${Math.max(0, Math.round((1 - b / a) * 100))}%)` : `${b} B`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => run("beautify")} className="btn-gold px-5 py-2 font-semibold text-black">Beautify</button>
        <button onClick={() => run("minify")} className="border border-white px-5 py-2 font-semibold hover:bg-gold hover:text-black">Minify</button>
        <label className="flex items-center gap-2 text-sm text-white/70">Indentasi
          <select value={indent} onChange={(e) => setIndent(e.target.value)} className="border border-white/30 bg-black px-2 py-1">
            <option value={"\t"}>Tab</option><option value="  ">2 spasi</option><option value="    ">4 spasi</option>
          </select>
        </label>
        <button onClick={() => { setInput(""); setOutput(""); setStat(""); }} className="text-sm text-white/60 underline">Kosongkan</button>
        <span className="ml-auto text-sm text-white/60">{stat}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1 text-sm">Kode masukan
          <textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="Tempel skrip Luau di sini" className={pane} />
        </label>
        <div className="grid gap-1 text-sm">
          <div className="flex items-center justify-between"><span>Hasil</span><CopyButton getText={() => output} /></div>
          <textarea value={output} readOnly spellCheck={false} aria-label="Hasil" className={pane} />
        </div>
      </div>
      <p className="text-xs text-white/50">Diproses di browser kamu; skrip tidak dikirim ke server. Minifier tidak mengubah nama variabel, hanya membuang komentar dan spasi (direktif --!strict dipertahankan).</p>
    </div>
  );
}
