// @ts-nocheck
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function validatePassword(pw) {
  if (typeof pw !== 'string') return 'Password non valida';
  if (pw.length < 10) return 'La password deve avere almeno 10 caratteri';
  if (!/[a-z]/.test(pw)) return 'La password deve contenere almeno una lettera minuscola';
  if (!/[A-Z]/.test(pw)) return 'La password deve contenere almeno una lettera maiuscola';
  if (!/[0-9]/.test(pw)) return 'La password deve contenere almeno una cifra';
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, passwordConfirm } = body || {};

    const normEmail = normalizeEmail(email);

    if (!normEmail || !normEmail.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: 'Le password non coincidono' }, { status: 400 });
    }
    const pwErr = validatePassword(password);
    if (pwErr) {
      return NextResponse.json({ error: pwErr }, { status: 400 });
    }

    // 1. Verifica esistenza cliente
    const cliente = await prisma.client.findFirst({
      where: { email: normEmail }
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Email non presente tra i clienti. Contatta l\'amministratore.' }, { status: 404 });
    }

    // 2. Verifica utente esistente
    const existingUser = await prisma.user.findUnique({ where: { email: normEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'Account già registrato. Esegui il login.' }, { status: 409 });
    }

    // 3. Recupera / crea ruolo cliente
    const roleCliente = await prisma.role.upsert({
      where: { name: 'cliente' },
      update: {},
      create: { name: 'cliente' }
    });

    // 4. Hash password
    const hash = bcrypt.hashSync(password, 10);

    // 5. Crea user
    const newUser = await prisma.user.create({
      data: {
        email: normEmail,
        name: cliente.nomeReferente || null,
        password: hash,
        roleId: roleCliente.id
      }
    });

    return NextResponse.json({
      ok: true,
      userId: newUser.id,
      email: newUser.email,
      clienteId: cliente.id
    }, { status: 201 });

  } catch (err) {
    console.error('Errore POST /api/auth/register:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}