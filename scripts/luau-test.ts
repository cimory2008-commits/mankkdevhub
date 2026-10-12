import { beautify, minify } from "../src/lib/luau.ts";
import assert from "node:assert/strict";

const messy = `--!strict
local   Players=game:GetService("Players") -- ambil service
local function add(a:number,b:number):number return a+b end
for i=1,10 do if i%2==0 then print("genap ".. i) elseif i==3 then print([[long
string]]) else print(-i) end end
local t={a=1,b={c=2},[3]=4}
local x = if a then 1 else 2
obj:Method(1,2)
--[[ blok
komentar ]]
return t`;

const pretty = beautify(messy);
console.log(pretty);
const min = minify(messy);
console.log("---- MINIFIED ----\n" + min);

// invarian dasar
assert.ok(min.includes('"genap "..i') || min.includes('"genap ".. i') || min.includes('"genap "..i'));
assert.ok(min.startsWith("--!strict\n"));
assert.ok(!min.includes("ambil service") && !min.includes("komentar"));
assert.ok(min.includes("[[long\nstring]]"));            // long-string utuh
assert.ok(min.includes("local x=if a then 1 else 2"));
assert.ok(!/\n\s*\n\s*\n/.test(pretty));
assert.equal(minify("local a = 1 -- c\nlocal b = a - -1"), "local a=1 local b=a- -1");
assert.equal(minify("x = 1 .. 2"), "x=1 .. 2");
// beautify idempoten
assert.equal(beautify(pretty), pretty);
console.log("OK semua assertion lolos");
