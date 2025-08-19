const fs = require("fs");
const path = require("path");

// Directory radice da cui partire
const SRC_ROOT = path.join(__dirname, "src");
const exts = [".js", ".jsx", ".tsx"];
// Cartelle da escludere (aggiungi qui altri path da saltare se necessario)
const EXCLUDE_DIRS = [
  path.join(SRC_ROOT, "generated"),
];

function isExcluded(filePath) {
  return EXCLUDE_DIRS.some(excludePath => filePath.startsWith(excludePath));
}

function findAllFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAllFiles(full, files);
    } else if (
      exts.includes(path.extname(entry.name)) &&
      !isExcluded(full)
    ) {
      files.push(full);
    }
  }
  return files;
}

function needsReactImport(content) {
  // Cerca JSX: <Qualcosa o </>
  const hasJSX = /(^|\s|;|=)<[A-Za-z]/m.test(content);
  // Verifica se già esiste import React
  const hasImport = /import\s+React(\s+from\s+['"]react['"])?/.test(content);
  return hasJSX && !hasImport;
}

function addReactImport(content) {
  // Inserisce import React dopo eventuali 'use client'/'use strict' e prime import
  const lines = content.split("\n");
  let insertAt = 0;
  // Salta 'use client' o 'use strict'
  if (/^['"]use (client|strict)['"];?$/.test(lines[0])) insertAt = 1;
  // Salta eventuali commenti iniziali
  while (lines[insertAt] && lines[insertAt].startsWith("//")) insertAt++;
  // Salta import già esistenti
  while (lines[insertAt] && lines[insertAt].startsWith("import ")) insertAt++;
  lines.splice(insertAt, 0, 'import React from "react";');
  return lines.join("\n");
}

// MAIN
const files = findAllFiles(SRC_ROOT);
let patched = 0;
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (needsReactImport(content)) {
    const fixed = addReactImport(content);
    fs.writeFileSync(file, fixed, "utf8");
    console.log("✅ Patch:", file);
    patched++;
  }
}
console.log(`\nPatch completata. File modificati: ${patched}/${files.length}`);