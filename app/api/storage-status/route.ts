// @ts-nocheck
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET

  const allEnvKeys = Object.keys(process.env)
  console.log('[storage-status-raw]', {
    cloud: cloud ? `"${cloud}"` : 'MISSING',
    key: key ? '✓' : 'MISSING',
    secret: secret ? '✓' : 'MISSING',
    cloudinaryUrl: process.env.CLOUDINARY_URL ? '✓' : 'MISSING',
    anyCloudinary: allEnvKeys.filter(k => k.toLowerCase().includes('cloudinary')),
    hasDatabase: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  })

  const cloudinaryOk = !!(cloud && key && secret)
  return NextResponse.json({ vercelReset: '2026-05-16', cloudinaryOk })
}
