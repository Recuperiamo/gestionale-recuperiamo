// @ts-nocheck
import { prisma } from '../../lib/prisma'

/**
 * Archivia automaticamente un pacchetto se:
 * - è saldato
 * - non è già archiviato
 * - oreSvolte >= oreAcquistate (tutte le ore acquistate sono state effettivamente svolte)
 */
export async function autoArchiviaSeNecessario(pacchettoId: number) {
  if (!pacchettoId) return
  const p = await prisma.pacchettoOre.findUnique({ where: { id: pacchettoId } })
  if (!p || !p.saldato || p.stato === 'archiviato') return

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
    const orario = a.orario ? new Date(a.orario) : new Date(a.createdAt)
    if (orario.getTime() < now - GRACE_MS) {
      oreSvolte += a.oreConsumate ?? a.durataOre ?? 0
    }
  }

  if (oreSvolte >= (p.oreAcquistate ?? 0)) {
    await prisma.pacchettoOre.update({
      where: { id: pacchettoId },
      data: { stato: 'archiviato' },
    })
  }
}
