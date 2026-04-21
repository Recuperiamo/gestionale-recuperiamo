// @ts-nocheck
export const dynamic = 'force-dynamic'

/**
 * Proxy per file Cloudinary.
 *
 * Il browser non può accedere direttamente a file Cloudinary che richiedono
 * autenticazione (401). Questo endpoint:
 *  1. Genera un URL firmato con la chiave API Cloudinary (valido 1 ora)
 *  2. Reindirizza il browser all'URL firmato
 *
 * Uso: /api/file-proxy?url=<encoded_cloudinary_url>
 *
 * Sicurezza: accetta solo URL cloudinary.com e vercel-storage.com
 */
import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  // Whitelist: solo Cloudinary e Vercel Blob
  const isCloudinary = url.includes('cloudinary.com')
  const isVercel = url.includes('vercel-storage.com')
  if (!isCloudinary && !isVercel) {
    return NextResponse.json({ error: 'URL non permesso' }, { status: 403 })
  }

  // Vercel Blob è pubblico — redirect diretto
  if (isVercel) {
    return NextResponse.redirect(url)
  }

  // Cloudinary: genera URL firmato
  try {
    configureCloudinary()

    // Estrai resource_type e public_id dall'URL
    // formato: https://res.cloudinary.com/{cloud}/{resource_type}/upload/v{n}/{public_id}.{ext}
    const match = url.match(/\/(image|raw|video)\/(?:upload|authenticated|private)\/(?:v\d+\/)?(.+?)(\.[^./]+)?$/)
    if (!match) {
      // URL non riconosciuto → prova redirect diretto
      return NextResponse.redirect(url)
    }

    const resourceType = match[1] as 'image' | 'raw' | 'video'
    const ext = match[3] || ''
    const publicId = match[2] + ext  // include estensione per raw

    // URL firmato, scade tra 1 ora
    const expiresAt = Math.floor(Date.now() / 1000) + 3600
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
      // type: 'upload' lavora sia per upload che authenticated
    })

    return NextResponse.redirect(signedUrl)
  } catch (err) {
    console.error('[file-proxy] Errore generazione URL firmato:', err)
    // Fallback: redirect all'URL originale
    return NextResponse.redirect(url)
  }
}
