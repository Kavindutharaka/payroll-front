const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve('D:/Dev/testing_fog/front-end/.claude/worktrees/elegant-faraday/src');
const FORM_FIELDS_SRC = path.join(SRC_DIR, 'components', 'FormFields.jsx');

function findJsxFiles(dir, results) {
  if (!results) results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsxFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.jsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getRelativePath(fromFile) {
  const fromDir = path.dirname(fromFile);
  const toFile = path.join(SRC_DIR, 'components', 'FormFields');
  let rel = path.relative(fromDir, toFile).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const files = findJsxFiles(SRC_DIR);
const modified = [];

for (const filePath of files) {
  if (path.resolve(filePath) === path.resolve(FORM_FIELDS_SRC)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const usesTextInput  = /<TextInput[\s\/>]/.test(content);
  const usesSelectComp = /<Select[\s\/>]/.test(content);
  const usesTextarea   = /<Textarea[\s\/>]/.test(content);

  if (!usesTextInput && !usesSelectComp && !usesTextarea) continue;

  if (usesTextInput) {
    content = content.replace(/<TextInput(?=[\s\/>])/g, '<CustomInput');
  }

  if (usesSelectComp) {
    content = content.replace(/<Select(?=[\s\/>])/g, '<CustomSelect');
    content = content.replace(/<\/Select>/g, '<\/CustomSelect>');
  }

  if (usesTextarea) {
    content = content.replace(/<Textarea(?=[\s\/>])/g, '<CustomTextarea');
    content = content.replace(/<\/Textarea>/g, '<\/CustomTextarea>');
  }

  // Remove TextInput, Select, Textarea from flowbite-react imports
  content = content.replace(
    /^(import\s*\{)([^}]+)(\}\s*from\s*['"]flowbite-react['"])/gm,
    function(match, open, names, close) {
      var toRemove = ['TextInput', 'Select', 'Textarea'];
      var parts = names.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      var remaining = parts.filter(function(p) { return toRemove.indexOf(p) === -1; });
      if (remaining.length === 0) {
        return '';
      }
      return open + ' ' + remaining.join(', ') + ' ' + close;
    }
  );

  var usedCustom = [];
  if (usesTextInput)  usedCustom.push('CustomInput');
  if (usesSelectComp) usedCustom.push('CustomSelect');
  if (usesTextarea)   usedCustom.push('CustomTextarea');

  var relPath = getRelativePath(filePath);
  var importStatement = 'import { ' + usedCustom.join(', ') + ' } from "' + relPath + '";';

  var alreadyHasFormFieldsImport = content.indexOf('from "' + relPath + '"') !== -1 ||
                                   content.indexOf("from '" + relPath + "'") !== -1;

  if (!alreadyHasFormFieldsImport) {
    var importRegex = /^import\s.+$/gm;
    var lastMatch = null;
    var m;
    while ((m = importRegex.exec(content)) !== null) {
      lastMatch = m;
    }
    if (lastMatch) {
      var insertPos = lastMatch.index + lastMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
    } else {
      content = importStatement + '\n' + content;
    }
  } else {
    var ffImportRe = /import\s*\{([^}]*)\}\s*from\s*["']([^"']*FormFields)["']/;
    content = content.replace(ffImportRe, function(match, existingNames) {
      var existing = existingNames.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      var allNeeded = existing.slice();
      usedCustom.forEach(function(c) {
        if (allNeeded.indexOf(c) === -1) allNeeded.push(c);
      });
      return 'import { ' + allNeeded.join(', ') + ' } from "' + relPath + '"';
    });
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modified.push({ file: path.relative(SRC_DIR, filePath), replaced: usedCustom });
  }
}

console.log('');
console.log('=== fix-formfields.js Summary ===');
console.log('');
if (modified.length === 0) {
  console.log('No files were modified.');
} else {
  console.log('Modified ' + modified.length + ' file(s):');
  console.log('');
  modified.forEach(function(item) {
    console.log('  ' + item.file);
    console.log('    -> Replaced: ' + item.replaced.join(', '));
  });
}
console.log('');
console.log('Done.');
