// @ts-nocheck
import { prisma } from '../../lib/prisma'

/**
 * Archivia il pacchetto se saldato E oreSvolte >= oreAcquistate.
 * Calcolo identico a PacchettoCard (frontend): usa || non ?? per le ore,
 * grace period 5 min, esclude cancellate.
 */
export async function autoArchiviaSeNecessario(pacchettoId: number) {
  if (!pacchettoId) return

  const p = await prisma.pacchettoOre.findUnique({ where: { id: pacchettoId } })
  if (!p || !p.saldato || p.stato === 'archiviato') return
  if (!p.oreAcquistate || p.oreAcquistate <= 0) return

  const attivita = await prisma.attivita.findMany({
    where: {
      pacchettoId,
      NOT: { stato: { in: ['cancellata', 'Cancellata', 'CANCELLATA'] } },
    },
    select: { orario: true, createdAt: true, oreConsumate: true, durataOre: true },
  })

  if (attivita.length === 0) return

  const GRACE_MS = 5 * 60 * 1000
  const now = Date.now()

  let oreSvolte = 0
  for (const a of attivita) {
    const ore = a.oreConsumate || a.durataOre || 0   // || identico alla card
    const orario = a.orario ? new Date(a.orario) : new Date(a.createdAt)
    if (orario.getTime() < now - GRACE_MS) {
      oreSvolte += ore
    }
  }

  if (oreSvolte >= p.oreAcquistate) {
    await prisma.pacchettoOre.update({
      where: { id: pacchettoId },
      data: { stato: 'archiviato' },
    })
  }
}
