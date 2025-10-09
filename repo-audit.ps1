Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$Root = (Get-Location).Path
$OutDir = Join-Path $Root 'audit-output'
If (-Not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

"START AUDIT: $(Get-Date -Format o)" | Out-File -FilePath (Join-Path $OutDir 'summary.txt') -Encoding utf8

# Git info and file list
git rev-parse --abbrev-ref HEAD 2>&1 | Out-File (Join-Path $OutDir 'git-branch.txt') -Encoding utf8
git remote -v 2>&1 | Out-File (Join-Path $OutDir 'git-remote.txt') -Encoding utf8
git ls-files 2>&1 | Out-File (Join-Path $OutDir 'elencocompleto.txt') -Encoding utf8

# Dependencies & audit
npm ci --no-audit --no-fund 2>&1 | Out-File (Join-Path $OutDir 'npm-ci.txt') -Encoding utf8
npm audit --json 2> $null | Out-File (Join-Path $OutDir 'npm-audit.json') -Encoding utf8

# Static analysis
npx tsc --noEmit 2>&1 | Out-File (Join-Path $OutDir 'tsc-out.txt') -Encoding utf8
npx eslint . --ext .ts,.tsx,.js -f unix 2>&1 | Out-File (Join-Path $OutDir 'eslint-out.txt') -Encoding utf8
npx prettier --check . 2>&1 | Out-File (Join-Path $OutDir 'prettier-out.txt') -Encoding utf8

# Tests & coverage
npm test --silent 2>&1 | Out-File (Join-Path $OutDir 'tests-out.txt') -Encoding utf8
npx nyc --reporter=text npm test 2>&1 | Out-File (Join-Path $OutDir 'coverage.txt') -Encoding utf8

# Build
npm run build --if-present 2>&1 | Out-File (Join-Path $OutDir 'build-out.txt') -Encoding utf8

# Prisma
If (Test-Path 'prisma\schema.prisma') {
  Copy-Item 'prisma\schema.prisma' -Destination (Join-Path $OutDir 'schema.prisma') -Force
  npx prisma migrate status --schema=prisma/schema.prisma 2>&1 | Out-File (Join-Path $OutDir 'prisma-migrate-status.txt') -Encoding utf8
} Else {
  "No prisma/schema.prisma found; skipping prisma checks." | Out-File (Join-Path $OutDir 'prisma-migrate-status.txt') -Encoding utf8
}

# DB checks (if DATABASE_URL is set)
If ($env:DATABASE_URL) {
  $dbCheckJs = @"
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
    try { await (new (require('@prisma/client').PrismaClient)()).$disconnect(); } catch(_) {}
  }
})();
"@
  $dbCheckPath = Join-Path $OutDir 'db-check.js'
  $dbCheckJs | Out-File -FilePath $dbCheckPath -Encoding utf8
  node $dbCheckPath 2>&1 | Out-File (Join-Path $OutDir 'db-check-out.txt') -Encoding utf8
} Else {
  "DATABASE_URL not set; skipping DB checks." | Out-File (Join-Path $OutDir 'db-check-out.txt') -Encoding utf8
}

"Audit finished at: $(Get-Date -Format o)" | Out-File -FilePath (Join-Path $OutDir 'summary.txt') -Append -Encoding utf8
Write-Output "Results saved to $OutDir"