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

  // Cloudinary: proxy server-side per bypassare restrizioni ACL/referer del browser
  try {
    configureCloudinary()

    const match = url.match(/\/(image|raw|video)\/(?:upload|authenticated|private)\/(?:v\d+\/)?(.+?)(\.[^./]+)?$/)
    let fetchUrl = url

    if (match) {
      const resourceType = match[1] as 'image' | 'raw' | 'video'
      const pubIdNoExt = match[2]
      const ext = match[3] || ''
      // image/video: public_id senza estensione; raw: con estensione (quirk Cloudinary)
      const publicId = resourceType === 'raw' ? (pubIdNoExt + ext) : pubIdNoExt
      const opts: any = {
        resource_type: resourceType,
        sign_url: true,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
      if (resourceType !== 'raw' && ext) opts.format = ext.slice(1)
      fetchUrl = cloudinary.url(publicId, opts)
    }

    const upstream = await fetch(fetchUrl)
    if (!upstream.ok) {
      console.error('[file-proxy] upstream error:', upstream.status, fetchUrl)
      return NextResponse.json({ error: `Errore file: ${upstream.status}` }, { status: upstream.status })
    }

    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': upstream.headers.get('content-disposition') || 'inline',
        'Cache-Control': 'private, max-age=3600',
      }
    })
  } catch (err) {
    console.error('[file-proxy] errore:', err)
    return NextResponse.json({ error: 'Errore proxy file' }, { status: 500 })
  }
}
