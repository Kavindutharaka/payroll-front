/**
 * fix-buttons.js
 * Replaces Flowbite <Button> → <CustomButton> and <ToggleSwitch> → <CustomToggle>
 * across all JSX page/component files.
 * Safe to run multiple times (idempotent after first pass).
 */
const fs   = require("fs");
const path = require("path");

const SRC  = path.resolve("D:/Dev/testing_fog/front-end/.claude/worktrees/elegant-faraday/src");
const SKIP = [
  path.join(SRC, "components", "FormFields.jsx"),
  path.join(SRC, "components", "CustomTable.jsx"),
];

function walkJsx(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walkJsx(fp, out);
    else if (e.name.endsWith(".jsx")) out.push(fp);
  }
  return out;
}

function relPath(fromFile, toNoExt) {
  let r = path.relative(path.dirname(fromFile), toNoExt).split(path.sep).join("/");
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}

const files = walkJsx(SRC).filter(fp => !SKIP.includes(path.resolve(fp)));
const modified = [];

for (const fp of files) {
  let raw = fs.readFileSync(fp, "utf8");
  const orig = raw;

  const usesButton = /<Button[\s>\/]/.test(raw) || /<\/Button>/.test(raw);
  const usesToggle = /<ToggleSwitch[\s>\/]/.test(raw);

  if (!usesButton && !usesToggle) continue;

  /* ── 1. Replace JSX tags ─────────────────────────────────────────────── */
  if (usesButton) {
    raw = raw.replace(/<Button(?=[\s>\/])/g, "<CustomButton");
    raw = raw.replace(/<\/Button>/g, "</CustomButton>");
  }
  if (usesToggle) {
    raw = raw.replace(/<ToggleSwitch(?=[\s>\/])/g, "<CustomToggle");
    // ToggleSwitch is self-closing, no </ToggleSwitch>
  }

  /* ── 2. Remove Button / ToggleSwitch from flowbite-react import ─────── */
  raw = raw.replace(
    /^(import\s*\{)([^}]+)(\}\s*from\s*['"]flowbite-react['"])/m,
    (match, open, names, close) => {
      let parts = names.split(",").map(s => s.trim()).filter(Boolean);
      parts = parts.filter(p => p !== "Button" && p !== "ToggleSwitch");
      if (parts.length === 0) return "";
      return open + " " + parts.join(", ") + " " + close;
    }
  );
  // Remove now-empty flowbite-react import line
  raw = raw.replace(/^import\s*\{\s*\}\s*from\s*['"]flowbite-react['"];?\n/m, "");

  /* ── 3. Add / update FormFields import ──────────────────────────────── */
  const ffPath = relPath(fp, path.join(SRC, "components", "FormFields"));
  const needsBtn    = usesButton;
  const needsToggle = usesToggle;

  const existingFfMatch = raw.match(
    /^import\s*\{([^}]*)\}\s*from\s*["']([^"']*FormFields)["']/m
  );

  if (existingFfMatch) {
    // Update existing import
    raw = raw.replace(
      /^import\s*\{([^}]*)\}\s*from\s*["']([^"']*FormFields)["']/m,
      (match, names) => {
        const existing = names.split(",").map(s => s.trim()).filter(Boolean);
        if (needsBtn    && !existing.includes("CustomButton")) existing.push("CustomButton");
        if (needsToggle && !existing.includes("CustomToggle"))  existing.push("CustomToggle");
        return `import { ${existing.join(", ")} } from "${ffPath}"`;
      }
    );
  } else {
    // Insert a new import
    const imports = [];
    if (needsBtn)    imports.push("CustomButton");
    if (needsToggle) imports.push("CustomToggle");
    const importLine = `import { ${imports.join(", ")} } from "${ffPath}";`;

    const importRe = /^import\s.+$/gm;
    let last = null, m;
    while ((m = importRe.exec(raw)) !== null) last = m;
    if (last) {
      const pos = last.index + last[0].length;
      raw = raw.slice(0, pos) + "\n" + importLine + raw.slice(pos);
    } else {
      raw = importLine + "\n" + raw;
    }
  }

  if (raw !== orig) {
    fs.writeFileSync(fp, raw, "utf8");
    modified.push(path.relative(SRC, fp));
  }
}

console.log(`\nModified ${modified.length} file(s):`);
modified.forEach(f => console.log("  " + f));
console.log("\nDone.");
