// @ts-nocheck
export const dynamic = 'force-dynamic'

/**
 * Proxy per file Cloudinary.
 *
 * Fetcha il file lato server (bypassando restrizioni ACL/referer del browser)
 * e lo streamma al client. Per Vercel Blob fa redirect diretto (pubblico).
 *
 * Uso: /api/file-proxy?url=<encoded_cloudinary_url>
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

  // Cloudinary: redirect a api.cloudinary.com tramite private_download_url
  // Bypassa le ACL del CDN (res.cloudinary.com) usando l'endpoint API autenticato
  try {
    configureCloudinary()
    const match = url.match(/\/(image|raw|video)\/(?:upload|authenticated|private)\/(?:v\d+\/)?(.+?)(\.[^./]+)?$/)
    if (!match) return NextResponse.redirect(url)

    const resourceType = match[1] as 'image' | 'raw' | 'video'
    const deliveryType = url.match(/\/(upload|authenticated|private)\//)?.[1] || 'upload'
    const pubIdNoExt = match[2]
    const ext = match[3] || ''
    const publicId = resourceType === 'raw' ? (pubIdNoExt + ext) : pubIdNoExt
    const format = ext ? ext.slice(1) : ''

    const downloadUrl = cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      attachment: false,
    })
    return NextResponse.redirect(downloadUrl)
  } catch (err) {
    console.error('[file-proxy] errore:', err)
    return NextResponse.json({ error: 'Errore proxy file' }, { status: 500 })
  }
}
