// @ts-nocheck
/**
 * Dual-storage: Vercel Blob (primario) → Cloudinary (fallback automatico).
 * Il provider viene dedotto dall'URL salvato nel DB per download/delete.
 */
import { put, del as vercelDel } from '@vercel/blob'
import { v2 as cloudinary } from 'cloudinary'

// ── Cloudinary config ─────────────────────────────────────────────────────────

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

function isCloudinaryUrl(url: string) {
  return url.includes('cloudinary.com')
}

function isVercelBlobUrl(url: string) {
  return url.includes('vercel-storage.com')
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadFile(
  filename: string,
  file: File | Blob,
  mimeType: string
): Promise<{ url: string; provider: 'vercel' | 'cloudinary' }> {

  // Prova Vercel Blob per prima
  try {
    const blob = await put(filename, file, { access: 'public', addRandomSuffix: true })
    return { url: blob.url, provider: 'vercel' }
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase()
    const suspended =
      msg.includes('suspended') || msg.includes('store') ||
      msg.includes('quota') || msg.includes('limit') ||
      err?.status === 403 || err?.status === 429
    if (!suspended) throw err
    // Vercel sospeso → fallback Cloudinary
  }

  // Upload su Cloudinary
  configureCloudinary()
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const dataUri = `data:${mimeType};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'auto',   // gestisce PDF, immagini, video, ecc.
    type: 'upload',          // delivery type pubblico (non authenticated/private)
    access_mode: 'public',   // esplicito: accessibile senza firma
    folder: 'recuperiamo',
    use_filename: true,
    unique_filename: true,
  })

  return { url: result.secure_url, provider: 'cloudinary' }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFile(url: string): Promise<void> {
  if (isVercelBlobUrl(url)) {
    await vercelDel(url)
    return
  }
  if (isCloudinaryUrl(url)) {
    configureCloudinary()
    // Estrai public_id dall'URL: .../recuperiamo/nome_file
    // formato: https://res.cloudinary.com/{cloud}/image|raw|video/upload/v123/{public_id}.ext
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/)
    if (match) {
      const publicId = match[1]
      await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }).catch(() => {})
    }
    return
  }
  // URL sconosciuto: ignora
  console.warn('[storage] deleteFile: URL provider non riconosciuto', url)
}

// ── Stato storage (per banner admin) ─────────────────────────────────────────

export function storageStatus() {
  const vercelReset = '2026-05-16'
  const cloudinaryOk = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
  return { vercelReset, cloudinaryOk }
}
