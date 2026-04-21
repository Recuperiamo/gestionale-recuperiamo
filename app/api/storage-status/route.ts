// @ts-nocheck
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { storageStatus } from '../../lib/storage'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['admin', 'operatore'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  const status = storageStatus()
  console.log('[storage-status]', {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '✓' : 'MISSING',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '✓' : 'MISSING',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '✓' : 'MISSING',
    cloudinaryOk: status.cloudinaryOk,
  })
  return NextResponse.json(status)
}
