#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
OUTDIR="$ROOT/audit-output"
mkdir -p "$OUTDIR"

echo "START AUDIT: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$OUTDIR/summary.txt"

# Git info and file list
echo "Collecting git info..." | tee -a "$OUTDIR/summary.txt"
git rev-parse --abbrev-ref HEAD > "$OUTDIR/git-branch.txt" 2>&1 || true
git remote -v > "$OUTDIR/git-remote.txt" 2>&1 || true
git ls-files > "$OUTDIR/elencocompleto.txt" 2>&1 || true

# Dependencies & audit
echo "Running npm ci and npm audit..." | tee -a "$OUTDIR/summary.txt"
npm ci --no-audit --no-fund 2>&1 | tee "$OUTDIR/npm-ci.txt" || true
npm audit --json > "$OUTDIR/npm-audit.json" 2>&1 || true

# Static analysis
echo "Running TypeScript check, ESLint, Prettier..." | tee -a "$OUTDIR/summary.txt"
npx tsc --noEmit > "$OUTDIR/tsc-out.txt" 2>&1 || true
npx eslint . --ext .ts,.tsx,.js -f unix > "$OUTDIR/eslint-out.txt" 2>&1 || true
npx prettier --check . > "$OUTDIR/prettier-out.txt" 2>&1 || true

# Tests & coverage
echo "Running tests and coverage (if available)..." | tee -a "$OUTDIR/summary.txt"
npm test --silent > "$OUTDIR/tests-out.txt" 2>&1 || true
npx nyc --reporter=text npm test > "$OUTDIR/coverage.txt" 2>&1 || true

# Build
echo "Running build (if present)..." | tee -a "$OUTDIR/summary.txt"
npm run build --if-present > "$OUTDIR/build-out.txt" 2>&1 || true

# Prisma schema & migrations
if [ -f "prisma/schema.prisma" ]; then
  echo "Collecting prisma schema and migration status..." | tee -a "$OUTDIR/summary.txt"
  cp prisma/schema.prisma "$OUTDIR/schema.prisma" 2>/dev/null || true
  npx prisma migrate status --schema=prisma/schema.prisma > "$OUTDIR/prisma-migrate-status.txt" 2>&1 || true
else
  echo "No prisma/schema.prisma found; skipping prisma checks." > "$OUTDIR/prisma-migrate-status.txt"
fi

# DB checks (optional) - runs only if DATABASE_URL is set in env
echo "DB checks..." | tee -a "$OUTDIR/summary.txt"
if [ -n "${DATABASE_URL:-}" ]; then
  cat > "$OUTDIR/db-check.js" <<'NODEJS'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient();
  try {
    const email = 'r3cuperiamo@gmail.com';
    console.log('FETCHING USER FOR EMAIL:', email);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, password: true } });
    console.log('USER:', user ? { id: user.id, email: user.email } : null);
    if (!user) { process.exit(0); }
    console.log('PASSWORD RAW:', user.password);
    console.log('PASSWORD LENGTH:', user.password.length);
    console.log('PASSWORD HEX:', Buffer.from(user.password, 'utf8').toString('hex'));
    const testPwd = process.env.AUDIT_TEST_PWD || 'TestCopilot2025!';
    console.log('ATTEMPT PWD (hidden length):', testPwd.length);
    console.log('COMPARE SYNC:', bcrypt.compareSync(testPwd, user.password));
    const asyncRes = await bcrypt.compare(testPwd, user.password);
    console.log('COMPARE ASYNC:', asyncRes);
  } catch (e) {
    console.error('DB CHECK ERROR', e);
    process.exit(1);
  } finally {
    try { await (new PrismaClient()).$disconnect(); } catch(_) {}
  }
})();
NODEJS
  node "$OUTDIR/db-check.js" > "$OUTDIR/db-check-out.txt" 2>&1 || true
else
  echo "DATABASE_URL not set; skipping DB checks." > "$OUTDIR/db-check-out.txt"
fi

echo "Audit finished at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$OUTDIR/summary.txt"
echo "Results saved to $OUTDIR"