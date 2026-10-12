"use client";
import { useState } from "react";

export default function CopyButton({ getText, label = "Copy Code" }: { getText: () => string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const text = getText();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1500);
  }
  return (
    <button onClick={copy} className="border border-white px-4 py-2 text-sm font-medium hover:bg-gold hover:text-black">
      {done ? "Tersalin" : label}
    </button>
  );
}
