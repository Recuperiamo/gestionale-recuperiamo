// @ts-nocheck
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET

  const allEnvKeys = Object.keys(process.env).sort()
  console.log('[storage-status-raw] ALL KEYS:', JSON.stringify(allEnvKeys))

  const cloudinaryOk = !!(cloud && key && secret)
  return NextResponse.json({ vercelReset: '2026-05-16', cloudinaryOk })
}
