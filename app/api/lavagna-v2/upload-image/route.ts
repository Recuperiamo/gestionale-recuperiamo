// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { put } from '@vercel/blob'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('image')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 })
    }

    const ext = file.name?.split('.').pop() || 'jpg'
    const blobName = `lavagna/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const blob = await put(blobName, file, { access: 'public' })

    return NextResponse.json({ url: blob.url })
  } catch (e) {
    console.error('[UPLOAD-IMAGE]', e)
    return NextResponse.json({ error: 'Upload fallito' }, { status: 500 })
  }
}
