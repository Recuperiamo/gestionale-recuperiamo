// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/authOptions'
import { storageStatus } from '../../lib/storage'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['admin', 'operatore'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  return NextResponse.json(storageStatus())
}
