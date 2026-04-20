// @ts-nocheck
import { prisma } from '../../lib/prisma'

/**
 * Archivia automaticamente un pacchetto se:
 * - è saldato
 * - non è già archiviato
 * - tutte le attività non cancellate sono nel passato (o stato='svolta')
 *   OPPURE le ore residue sono <= 0 (ore esaurite)
 * - esiste almeno un'attività non cancellata
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
    select: { orario: true, stato: true, oreConsumate: true, durataOre: true },
  })

  if (attivita.length === 0) return

  const now = new Date()
  const tutteSvolte = attivita.every(a => {
    if ((a.stato || '').toLowerCase() === 'svolta') return true
    if (a.orario && new Date(a.orario) < now) return true
    return false
  })

  // Archivia se tutte le lezioni sono passate, oppure le ore sono esaurite
  const oreEsaurite = (p.oreResidue ?? 0) <= 0
  if (tutteSvolte || oreEsaurite) {
    await prisma.pacchettoOre.update({
      where: { id: pacchettoId },
      data: { stato: 'archiviato' },
    })
  }
}
