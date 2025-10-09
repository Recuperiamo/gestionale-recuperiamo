// Simple safeguard to ensure the production build did not accidentally pull a React 19/canary bundle.
// It scans the .next output for unwanted version markers. Intended to run after `next build`.
// You can relax it locally by skipping the ENFORCE_REACT18 env var; by default it only warns.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, '.next');
const ENFORCE = process.env.ENFORCE_REACT18 === '1';

// Patterns that would indicate a React 19 (stable or canary) bundle slipped in.
const BLOCK_PATTERNS = [
  /19\.\d+\.\d+(-canary[-\w]*)?/i,           // any 19.x.x or 19.x.x-canary
  /react-dom@19/i,
  /react@19/i,
  /19\.2\.0-canary/i,                          // specifically the canary you pasted
];

function scanFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        // Skip large non-code subfolders to save time
        if (ent.name === 'cache') continue;
        stack.push(full);
      } else if (ent.isFile()) {
        // Only inspect reasonably small text-like assets
        if (/\.(js|mjs|cjs|txt|json)$/.test(ent.name)) {
          const size = fs.statSync(full).size;
          if (size > 2_000_000) continue; // skip huge chunks to keep it fast
          try {
            const content = fs.readFileSync(full, 'utf8');
            for (const pat of BLOCK_PATTERNS) {
              if (pat.test(content)) {
                results.push({ file: full, pattern: pat.toString() });
                break; // avoid duplicate entries for same file
              }
            }
          } catch { /* ignore read errors */ }
        }
      }
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.warn('[react18-guard] .next build directory not found; skipping check.');
    return;
  }
  const hits = scanFiles(BUILD_DIR);
  if (hits.length === 0) {
    console.log('[react18-guard] OK: no React 19 / canary markers found in build output.');
    return;
  }
  const header = `\n[react18-guard] Detected ${hits.length} potential React 19 / canary markers:`;
  console.warn(header);
  for (const h of hits) {
    console.warn(`  - ${h.file}  => matched ${h.pattern}`);
  }
  if (ENFORCE) {
    console.error('\n[react18-guard] Failing build because ENFORCE_REACT18=1 is set.');
    process.exit(1);
  } else {
    console.warn('\n[react18-guard] (Warning only) – set ENFORCE_REACT18=1 to turn this into a hard failure.');
  }
}

main();
