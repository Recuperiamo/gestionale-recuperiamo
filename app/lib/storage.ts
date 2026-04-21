// @ts-nocheck
/**
 * Dual-storage abstraction: Vercel Blob (primary) → Cloudflare R2 (fallback).
 * Automaticamente usa R2 se Vercel Blob è sospeso.
 * Il provider viene dedotto dall'URL già salvato nel DB per download/delete.
 */
import { put, del as vercelDel } from '@vercel/blob'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

// ── R2 client ────────────────────────────────────────────────────────────────

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  if (!accountId) throw new Error('R2_ACCOUNT_ID non configurato')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

function r2PublicUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '')
  if (!base) throw new Error('R2_PUBLIC_URL non configurato')
  return `${base}/${key}`
}

function isVercelBlob(url: string) {
  return url.includes('vercel-storage.com') || url.includes('blob.vercel-storage')
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadFile(
  filename: string,
  file: File | Blob,
  mimeType: string
): Promise<{ url: string; provider: 'vercel' | 'r2' }> {
  // Prova Vercel Blob per prima
  try {
    const blob = await put(filename, file, { access: 'public', addRandomSuffix: true })
    return { url: blob.url, provider: 'vercel' }
  } catch (err: any) {
    const msg = err?.message || ''
    const isStoreSuspended =
      msg.includes('suspended') ||
      msg.includes('store') ||
      msg.includes('quota') ||
      msg.includes('limit') ||
      err?.status === 403 ||
      err?.status === 429
    if (!isStoreSuspended) throw err
    // Vercel sospeso → fallback R2
  }

  // Upload su R2
  const r2 = getR2Client()
  const bucket = process.env.R2_BUCKET_NAME!
  const key = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read',
  }))
  return { url: r2PublicUrl(key), provider: 'r2' }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFile(url: string): Promise<void> {
  if (isVercelBlob(url)) {
    await vercelDel(url)
    return
  }
  // R2: estrai la chiave dall'URL pubblico
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || ''
  const key = url.replace(base + '/', '')
  const r2 = getR2Client()
  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
}

// ── Stato storage (per banner admin) ─────────────────────────────────────────

export function storageStatus() {
  const vercelReset = '2026-05-16' // data reset piano Vercel
  const r2Ok = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_BUCKET_NAME)
  return { vercelReset, r2Ok }
}
