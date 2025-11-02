import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStati() {
  console.log('Correzione stati pacchetti...\n');
  
  // Trova tutti i pacchetti con stato 'esaurito'
  const pacchettiEsauriti = await prisma.pacchettoOre.findMany({
    where: { stato: 'esaurito' }
  });
  
  console.log(`Trovati ${pacchettiEsauriti.length} pacchetti con stato 'esaurito'`);
  
  if (pacchettiEsauriti.length > 0) {
    // Aggiorna tutti a 'attivo'
    const result = await prisma.pacchettoOre.updateMany({
      where: { stato: 'esaurito' },
      data: { stato: 'attivo' }
    });
    
    console.log(`✓ Aggiornati ${result.count} pacchetti da 'esaurito' a 'attivo'`);
  }
  
  // Verifica finale
  const stati = await prisma.pacchettoOre.groupBy({
    by: ['stato'],
    _count: true
  });
  
  console.log('\nDistribuzione stati finale:');
  stati.forEach(s => {
    console.log(`  ${s.stato}: ${s._count}`);
  });
  
  await prisma.$disconnect();
}

fixStati().catch(console.error);
