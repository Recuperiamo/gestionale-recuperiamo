// @ts-nocheck
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/authOptions'
import { uploadFile } from '../../../lib/storage'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'Nessun file' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo immagini consentite' }, { status: 400 })
  }

  const MAX_MB = 10
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File troppo grande (max ${MAX_MB}MB)` }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const { url } = await uploadFile(
    `test-allegati/${Date.now()}-${safeName}`,
    file,
    file.type
  )

  return NextResponse.json({ url })
}
