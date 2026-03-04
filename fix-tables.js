/**
 * fix-tables.js
 * Replaces ALL remaining Flowbite Table component tags with CustomTable equivalents.
 * Safe to run multiple times (idempotent).
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(
  "D:/Dev/testing_fog/front-end/.claude/worktrees/elegant-faraday/src"
);
const SKIP = path.join(SRC_DIR, "components", "CustomTable.jsx");

const MAP = {
  TableHeadCell: "CustomTableHeadCell", // must come before TableHead / TableCell
  TableHead: "CustomTableHead",
  TableBody: "CustomTableBody",
  TableRow: "CustomTableRow",
  TableCell: "CustomTableCell",
  Table: "CustomTable",              // last so it doesn't greedily consume the others
};

function walkJsx(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walkJsx(fp, out);
    else if (e.name.endsWith(".jsx")) out.push(fp);
  }
  return out;
}

function relPath(fromFile, toNoExt) {
  let r = path
    .relative(path.dirname(fromFile), toNoExt)
    .split(path.sep)
    .join("/");
  if (!r.startsWith(".")) r = "./" + r;
  return r;
}

const allCustomNames = Object.values(MAP);
const files = walkJsx(SRC_DIR).filter(
  (f) => path.resolve(f) !== path.resolve(SKIP)
);
const modified = [];

for (const fp of files) {
  let raw = fs.readFileSync(fp, "utf8");
  const orig = raw;

  // --- 1. Replace opening & closing tags for each component ---
  // Process in order: HeadCell before Head, Cell after others
  for (const [flowbite, custom] of Object.entries(MAP)) {
    // Opening tag: <TableXxx followed by whitespace, >, or /
    raw = raw.replace(
      new RegExp(`<${flowbite}(?=[\\s>\/])`, "g"),
      `<${custom}`
    );
    // Closing tag: </TableXxx>
    raw = raw.replace(new RegExp(`</${flowbite}>`, "g"), `</${custom}>`);
  }

  if (raw === orig) continue; // nothing changed

  // --- 2. Ensure import exists ---
  // Collect which custom names are actually used after replacement
  const usedCustom = allCustomNames.filter((n) => {
    const re = new RegExp(`<${n}[\\s>\\/]|<\\/${n}>`);
    return re.test(raw);
  });

  if (usedCustom.length > 0 && !raw.includes("CustomTable")) {
    const ctPath = relPath(fp, path.join(SRC_DIR, "components", "CustomTable"));
    const importLine = `import { ${usedCustom.join(", ")} } from "${ctPath}";`;

    // Insert after the last import statement
    const importRe = /^import\s.+$/gm;
    let last = null, m;
    while ((m = importRe.exec(raw)) !== null) last = m;
    if (last) {
      const pos = last.index + last[0].length;
      raw = raw.slice(0, pos) + "\n" + importLine + raw.slice(pos);
    } else {
      raw = importLine + "\n" + raw;
    }
  } else if (raw.includes("CustomTable")) {
    // Update existing import to include all used names
    raw = raw.replace(
      /^import\s*\{([^}]*)\}\s*from\s*["']([^"']*CustomTable)["']/m,
      (match, existingNames) => {
        const existing = existingNames
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const merged = [...new Set([...existing, ...usedCustom])];
        const ctPath = relPath(
          fp,
          path.join(SRC_DIR, "components", "CustomTable")
        );
        return `import { ${merged.join(", ")} } from "${ctPath}"`;
      }
    );
  }

  // --- 3. Remove Flowbite table names from flowbite-react import ---
  const flowbiteNames = Object.keys(MAP);
  raw = raw.replace(
    /^(import\s*\{)([^}]+)(\}\s*from\s*['"]flowbite-react['"])/m,
    (match, open, names, close) => {
      let parts = names
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((p) => !flowbiteNames.includes(p));
      if (parts.length === 0) return "";
      return open + " " + parts.join(", ") + " " + close;
    }
  );
  // Remove empty flowbite-react import
  raw = raw.replace(
    /^import\s*\{\s*\}\s*from\s*['"]flowbite-react['"];?\n/m,
    ""
  );

  fs.writeFileSync(fp, raw, "utf8");
  modified.push(path.relative(SRC_DIR, fp));
}

console.log(`\nModified ${modified.length} file(s):`);
modified.forEach((f) => console.log("  " + f));
console.log("\nDone.");
