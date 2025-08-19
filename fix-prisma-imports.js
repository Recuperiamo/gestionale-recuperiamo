const fs = require("fs");
const path = require("path");

const SRC_ROOTS = [
  path.join(__dirname, "src"),
  path.join(__dirname, "app"),
];

// Estensioni file da processare
const exts = [".js", ".jsx", ".ts", ".tsx"];

// Cartelle da escludere (aggiungi qui altre se vuoi, es: node_modules, .next, ecc)
const EXCLUDE_DIRS = [
  path.join(__dirname, "node_modules"),
  path.join(__dirname, ".next"),
  path.join(__dirname, ".git"),
];

function isExcluded(filePath) {
  return EXCLUDE_DIRS.some(excludePath => filePath.startsWith(excludePath));
}

function findAllFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcluded(full)) findAllFiles(full, files);
    } else if (exts.includes(path.extname(entry.name)) && !isExcluded(full)) {
      files.push(full);
    }
  }
  return files;
}

function fixPrismaImport(content) {
  // Sostituisce SOLO import default prisma, lasciando intatti gli import già corretti
  // Esempio: import prisma from '@/lib/prisma' => import { prisma } from '@/lib/prisma'
  return content.replace(
    /import\s+prisma\s+from\s+(['"][^'"]*prisma['"])/g,
    "import { prisma } from $1"
  );
}

// MAIN
const files = [];
SRC_ROOTS.forEach(root => findAllFiles(root, files));
let patched = 0;
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (/import\s+prisma\s+from\s+['"][^'"]*prisma['"]/.test(content)) {
    const fixed = fixPrismaImport(content);
    fs.writeFileSync(file, fixed, "utf8");
    console.log("✅ Patch:", file);
    patched++;
  }
}
console.log(`\nPatch completata. File modificati: ${patched}/${files.length}`);