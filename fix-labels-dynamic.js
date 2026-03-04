/**
 * fix-labels-dynamic.js
 * 1. Fixes remaining dynamic <Label value={...} /> usages
 * 2. Removes stray lone-semicolon lines from previous import cleanups
 */

const fs   = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src");

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (f.endsWith(".jsx") || f.endsWith(".tsx") || f.endsWith(".js")) files.push(full);
  }
  return files;
}

let modCount = 0;

for (const file of walk(SRC)) {
  let raw = fs.readFileSync(file, "utf8");
  let changed = false;

  // ── 1. Dynamic: <Label htmlFor="x" value={expr} />  (multiline supported)
  //    → <CustomLabel htmlFor="x">{expr}</CustomLabel>
  const dynWithHtmlFor = /<Label\s+htmlFor="([^"]+)"\s*\n?\s*value=\{([^}]+)\}\s*\/>/g;
  const r1 = raw.replace(dynWithHtmlFor, (_, hf, expr) =>
    `<CustomLabel htmlFor="${hf}">{${expr}}</CustomLabel>`
  );
  if (r1 !== raw) { raw = r1; changed = true; }

  // Also handle single-line: <Label htmlFor="x" value={expr} />
  const dynWithHtmlForInline = /<Label\s+htmlFor="([^"]+)"\s+value=\{([^}]+)\}\s*\/>/g;
  const r1b = raw.replace(dynWithHtmlForInline, (_, hf, expr) =>
    `<CustomLabel htmlFor="${hf}">{${expr}}</CustomLabel>`
  );
  if (r1b !== raw) { raw = r1b; changed = true; }

  // ── 2. Dynamic: <Label value={expr} />  (no htmlFor)
  //    → <CustomLabel>{expr}</CustomLabel>
  const dynNoHtmlFor = /<Label\s+value=\{([^}]+)\}\s*\/>/g;
  const r2 = raw.replace(dynNoHtmlFor, (_, expr) => `<CustomLabel>{${expr}}</CustomLabel>`);
  if (r2 !== raw) { raw = r2; changed = true; }

  // ── 3. If we replaced any Labels, ensure Label removed from flowbite-react import
  if (changed) {
    raw = raw.replace(
      /import\s*\{([^}]+)\}\s*from\s*["']flowbite-react["']/gm,
      (match, names) => {
        const cleaned = names.split(",").map(n => n.trim()).filter(n => n && n !== "Label").join(", ");
        return cleaned ? `import { ${cleaned} } from "flowbite-react"` : "";
      }
    );
    // remove fully empty flowbite-react import
    raw = raw.replace(/import\s*\{\s*\}\s*from\s*["']flowbite-react["'];?\s*\n?/g, "");
  }

  // ── 4. Remove stray lone-semicolons on their own line (from any previous cleanup)
  const r4 = raw.replace(/^[ \t]*;[ \t]*\r?\n/gm, "");
  if (r4 !== raw) { raw = r4; changed = true; }

  if (!changed) continue;

  fs.writeFileSync(file, raw, "utf8");
  console.log("✔ updated:", path.relative(__dirname, file));
  modCount++;
}

console.log(`\nDone. ${modCount} file(s) modified.`);
