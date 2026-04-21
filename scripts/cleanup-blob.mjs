/**
 * Esegui con:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_... node scripts/cleanup-blob.mjs
 *
 * Aggiunge --delete per cancellare davvero (default: solo lista)
 */
import { list, del } from "@vercel/blob";

const DELETE = process.argv.includes("--delete");

let cursor;
let totalBytes = 0;
let count = 0;
const blobs = [];

do {
  const res = await list({ cursor, limit: 1000 });
  blobs.push(...res.blobs);
  cursor = res.cursor;
  if (!res.hasMore) break;
} while (true);

blobs.sort((a, b) => b.size - a.size);

for (const b of blobs) {
  const mb = (b.size / 1024 / 1024).toFixed(2);
  console.log(`${mb} MB  ${b.pathname}  ${b.url}`);
  totalBytes += b.size;
  count++;
}

console.log(`\nTotale: ${count} file, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

if (DELETE) {
  console.log("\nCancellazione in corso…");
  for (const b of blobs) {
    try {
      await del(b.url);
      console.log(`  ✓ ${b.pathname}`);
    } catch (e) {
      console.error(`  ✗ ${b.pathname}: ${e.message}`);
    }
  }
  console.log("Fatto.");
} else {
  console.log('\nPer cancellare tutto: aggiungi --delete al comando');
  console.log('Per cancellare solo alcuni: modifica il filtro nel codice (es. pathname.endsWith(".pdf"))');
}
