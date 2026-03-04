/**
 * fix-labels.js
 * Replaces Flowbite <Label> with <CustomLabel> across all form files.
 *
 * Converts:  <Label htmlFor="x" value="Text" />
 * To:        <CustomLabel htmlFor="x">Text</CustomLabel>
 *
 * Also handles:  <Label value="Text" />
 * To:            <CustomLabel>Text</CustomLabel>
 *
 * Updates imports: removes Label from flowbite-react, adds CustomLabel to FormFields
 */

const fs   = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src");

// ── helpers ───────────────────────────────────────────────────────────────
function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (f.endsWith(".jsx") || f.endsWith(".tsx") || f.endsWith(".js"))
      files.push(full);
  }
  return files;
}

function relPath(file) {
  const rel = path.relative(path.dirname(file), path.join(SRC, "components/FormFields"));
  return rel.startsWith(".") ? rel.replace(/\\/g, "/") : "./" + rel.replace(/\\/g, "/");
}

// ── process ───────────────────────────────────────────────────────────────
let modCount = 0;

for (const file of walk(SRC)) {
  let raw = fs.readFileSync(file, "utf8");
  if (!raw.includes("<Label")) continue;  // skip if no Label JSX usage

  let changed = false;

  // 1. Replace <Label htmlFor="x" value="Text" /> → <CustomLabel htmlFor="x">Text</CustomLabel>
  //    (any order of attributes)
  const withHtmlFor = /<Label\s+(?:htmlFor="([^"]*?)"\s+value="([^"]*?)"|value="([^"]*?)"\s+htmlFor="([^"]*?)")\s*\/>/g;
  const replaced1 = raw.replace(withHtmlFor, (_, hf1, v1, v2, hf2) => {
    const htmlFor = hf1 ?? hf2;
    const value   = v1  ?? v2;
    return `<CustomLabel htmlFor="${htmlFor}">${value}</CustomLabel>`;
  });
  if (replaced1 !== raw) { raw = replaced1; changed = true; }

  // 2. Replace <Label value="Text" /> (no htmlFor) → <CustomLabel>Text</CustomLabel>
  const withoutHtmlFor = /<Label\s+value="([^"]*?)"\s*\/>/g;
  const replaced2 = raw.replace(withoutHtmlFor, (_, v) => `<CustomLabel>${v}</CustomLabel>`);
  if (replaced2 !== raw) { raw = replaced2; changed = true; }

  if (!changed) continue;

  // 3. Remove Label from flowbite-react import
  // Remove from multi-item import: { ..., Label, ... } or { Label, ... } or { ..., Label }
  raw = raw.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']flowbite-react["']/gm,
    (match, names) => {
      const cleaned = names
        .split(",")
        .map(n => n.trim())
        .filter(n => n !== "" && n !== "Label")
        .join(", ");
      if (!cleaned) return "";            // entire import removed
      return `import { ${cleaned} } from "flowbite-react"`;
    }
  );
  // Remove stray empty lines left by blank import removals
  raw = raw.replace(/^\s*\n/gm, (m, offset) => {
    // only collapse if the previous non-empty line was an import removal
    return m;
  });

  // 4. Add / update CustomLabel in FormFields import
  const formFieldsRel = relPath(file);

  if (raw.includes(`from "${formFieldsRel}"`)) {
    // FormFields already imported — add CustomLabel to the named list
    raw = raw.replace(
      new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*["']${formFieldsRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`),
      (match, names) => {
        const parts = names.split(",").map(n => n.trim()).filter(Boolean);
        if (!parts.includes("CustomLabel")) parts.unshift("CustomLabel");
        return `import { ${parts.join(", ")} } from "${formFieldsRel}"`;
      }
    );
  } else {
    // FormFields not imported yet — inject after last import line
    const lastImport = [...raw.matchAll(/^import .+;?\s*$/gm)].pop();
    if (lastImport) {
      const insertAt = lastImport.index + lastImport[0].length;
      raw = raw.slice(0, insertAt) + `\nimport { CustomLabel } from "${formFieldsRel}";` + raw.slice(insertAt);
    }
  }

  // 5. Clean up completely empty flowbite-react import lines  (e.g. `import {  } from "flowbite-react"`)
  raw = raw.replace(/import\s*\{\s*\}\s*from\s*["']flowbite-react["'];?\s*\n?/g, "");
  // Remove stray lone semicolons left on their own line
  raw = raw.replace(/^[ \t]*;[ \t]*\n/gm, "");

  fs.writeFileSync(file, raw, "utf8");
  console.log("✔ updated:", path.relative(__dirname, file));
  modCount++;
}

console.log(`\nDone. ${modCount} file(s) modified.`);
