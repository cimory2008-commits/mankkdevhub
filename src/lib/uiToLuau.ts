export type ElClass = "Frame" | "TextLabel" | "TextButton" | "TextBox" | "ImageLabel";

export interface UiEl {
  id: string;
  parent: string | null;
  cls: ElClass;
  name: string;
  x: number; y: number; w: number; h: number;   // piksel, relatif ke parent
  bg: string; bgT: number;                      // warna hex & transparansi 0..1
  text: string; textColor: string; textSize: number;
  radius: number;
  strokeColor: string; strokeW: number;
  image: string;
  z: number;
}

export type Units = "offset" | "scale";
export const CANVAS = { w: 640, h: 360 };

const rgb = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex) ?? ["", "000000"];
  const n = parseInt(m[1], 16);
  return `Color3.fromRGB(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
const r4 = (n: number) => String(Math.round(n * 10000) / 10000);
const ident = (s: string) => {
  const v = s.replace(/[^A-Za-z0-9_]/g, "_") || "element";
  return /^\d/.test(v) ? "_" + v : v;
};

export function descendantsOf(els: UiEl[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (pid: string) => els.filter((e) => e.parent === pid).forEach((c) => { out.add(c.id); walk(c.id); });
  walk(id);
  return out;
}

export function toLuau(els: UiEl[], units: Units, guiName = "MyUI"): string {
  const L: string[] = [];
  L.push("-- Dibuat oleh 4MankkDev Assets • UI to Luau");
  L.push("-- Taruh di StarterGui sebagai LocalScript.");
  L.push('local Players = game:GetService("Players")', "");
  L.push('local screenGui = Instance.new("ScreenGui")');
  L.push(`screenGui.Name = ${q(guiName)}`);
  L.push("screenGui.ResetOnSpawn = false");
  L.push("screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling", "");

  const used = new Map<string, number>();
  const vars = new Map<string, string>();
  const byId = new Map(els.map((e) => [e.id, e]));
  const udim = (a: number, b: number, pw: number, ph: number) =>
    units === "scale" ? `UDim2.fromScale(${r4(a / pw)}, ${r4(b / ph)})` : `UDim2.fromOffset(${Math.round(a)}, ${Math.round(b)})`;

  const emit = (e: UiEl) => {
    const base = ident(e.name);
    const k = used.get(base) ?? 0;
    used.set(base, k + 1);
    const v = k ? `${base}${k + 1}` : base;
    vars.set(e.id, v);

    const par = e.parent ? byId.get(e.parent)! : null;
    const pw = par ? par.w : CANVAS.w, ph = par ? par.h : CANVAS.h;

    L.push(`local ${v} = Instance.new(${q(e.cls)})`);
    L.push(`${v}.Name = ${q(e.name)}`);
    L.push(`${v}.Position = ${udim(e.x, e.y, pw, ph)}`);
    L.push(`${v}.Size = ${udim(e.w, e.h, pw, ph)}`);
    L.push(`${v}.BackgroundColor3 = ${rgb(e.bg)}`);
    L.push(`${v}.BackgroundTransparency = ${r4(e.bgT)}`);
    L.push(`${v}.BorderSizePixel = 0`);
    if (e.z) L.push(`${v}.ZIndex = ${e.z}`);
    if (e.cls === "TextLabel" || e.cls === "TextButton" || e.cls === "TextBox") {
      L.push(`${v}.${e.cls === "TextBox" ? "PlaceholderText" : "Text"} = ${q(e.text)}`);
      L.push(`${v}.TextColor3 = ${rgb(e.textColor)}`);
      L.push(`${v}.TextSize = ${e.textSize}`);
      L.push(`${v}.Font = Enum.Font.GothamMedium`);
      if (e.cls === "TextBox") L.push(`${v}.Text = ""`, `${v}.ClearTextOnFocus = false`);
    }
    if (e.cls === "ImageLabel") L.push(`${v}.Image = ${q(e.image)}`);
    if (e.radius > 0) {
      L.push(`do local c = Instance.new("UICorner") c.CornerRadius = UDim.new(0, ${e.radius}) c.Parent = ${v} end`);
    }
    if (e.strokeW > 0) {
      L.push(`do local s = Instance.new("UIStroke") s.Color = ${rgb(e.strokeColor)} s.Thickness = ${e.strokeW} s.Parent = ${v} end`);
    }
    L.push(`${v}.Parent = ${par ? vars.get(par.id) : "screenGui"}`, "");
    els.filter((c) => c.parent === e.id).forEach(emit);
  };
  els.filter((e) => !e.parent).forEach(emit);

  L.push('screenGui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")');
  return L.join("\n");
}
