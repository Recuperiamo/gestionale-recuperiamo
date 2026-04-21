// @ts-nocheck
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET

  console.log('[storage-status-project]', {
    project: process.env.VERCEL_PROJECT_NAME,
    url: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? 'MISSING',
  })

  const cloudinaryOk = !!(cloud && key && secret)
  return NextResponse.json({ vercelReset: '2026-05-16', cloudinaryOk })
}
