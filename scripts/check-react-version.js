// Simple safeguard to ensure the production build did not accidentally pull a React 19/canary bundle.
// It scans the .next output for unwanted version markers. Intended to run after `next build`.
// You can relax it locally by skipping the ENFORCE_REACT18 env var; by default it only warns.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, '.next');
const ENFORCE = process.env.ENFORCE_REACT18 === '1';

// We limit detection to stronger signatures to avoid generic matches of other libs with 19.x versions.
// The previous broad /19.x/ pattern caused many false positives in package.json files.
const BLOCK_PATTERNS = [
  /19\.2\.0-canary[-\w]*/i,          // exact canary family you pasted
  /react-dom@19\b/i,                  // explicit react-dom 19 reference
  /react@19\b/i,                      // explicit react 19 reference
  /react-dom\\?\.production\\?\.min\\?\.js[^\n]*19\.\d+\.\d+/i, // react-dom production bundle containing 19.x marker
  /"version"\s*:\s*"19\.[0-9]+\.[0-9]+(-canary[^"]*)?"\s*,?\s*\n(?=.*"name"\s*:\s*"react(-dom)?")/i // react or react-dom package.json declaring 19
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
        // Only inspect relevant artifact file types
        if (!/\.(js|mjs|cjs|json)$/.test(ent.name)) continue;
        // Ignore package.json for unrelated packages unless it's react or react-dom.
        if (ent.name === 'package.json' && !/react(-dom)?/.test(current)) continue;
        const size = fs.statSync(full).size;
        if (size > 2_000_000) continue; // skip huge files for speed
        let content;
        try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
        // Quick prefilter: look for 'react' or the exact canary snippet to avoid scanning arbitrary files.
        if (!/react|19\.2\.0-canary/i.test(content)) continue;
        for (const pat of BLOCK_PATTERNS) {
          if (pat.test(content)) {
            results.push({ file: full, pattern: pat.toString() });
            break;
          }
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
