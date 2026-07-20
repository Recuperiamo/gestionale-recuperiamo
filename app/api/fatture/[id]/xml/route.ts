// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isAdmin(session) {
  const r = session?.user?.role;
  return r === 'admin' || r === 'operatore';
}

const x = (s: string) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const n2 = (v: number) => Number(v).toFixed(2);
const fmtDate = (d: Date | string) => new Date(d).toISOString().substring(0, 10);

function buildXml(fattura: any, cfg: any): string {
  const dest = fattura.destinatario as any;
  const voci = fattura.voci as any[];

  const idTrasmittente = cfg.partitaIva || cfg.codiceFiscale || '00000000000';
  const progressivo = String(fattura.progressivoInvio ?? fattura.numero).padStart(5, '0');
  const sdiCode = dest.codiceDestinatarioSdi?.trim() || '0000000';
  const pecLine = (dest.pec?.trim() && sdiCode === '0000000')
    ? `\n      <PECDestinatario>${x(dest.pec)}</PECDestinatario>` : '';

  // Cedente anagrafica
  const cedenteAnagrafica = cfg.cognome?.trim()
    ? `<Nome>${x(cfg.nome)}</Nome>\n          <Cognome>${x(cfg.cognome)}</Cognome>`
    : `<Denominazione>${x(cfg.nome)}</Denominazione>`;

  // Cessionario anagrafica
  let cessAnag = '';
  if (dest.partitaIva?.trim()) {
    cessAnag = `
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>${x(dest.paese || 'IT')}</IdPaese>
          <IdCodice>${x(dest.partitaIva)}</IdCodice>
        </IdFiscaleIVA>${dest.codiceFiscale ? `\n        <CodiceFiscale>${x(dest.codiceFiscale)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${x(dest.nome + (dest.cognome ? ' ' + dest.cognome : ''))}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>`;
  } else {
    const cfLine = dest.codiceFiscale ? `\n        <CodiceFiscale>${x(dest.codiceFiscale)}</CodiceFiscale>` : '';
    const anagLine = dest.cognome?.trim()
      ? `<Nome>${x(dest.nome)}</Nome>\n          <Cognome>${x(dest.cognome)}</Cognome>`
      : `<Denominazione>${x(dest.nome || 'N/D')}</Denominazione>`;
    cessAnag = `
      <DatiAnagrafici>${cfLine}
        <Anagrafica>
          ${anagLine}
        </Anagrafica>
      </DatiAnagrafici>`;
  }

  // Linee
  const linee = voci.map((v, i) => `
      <DettaglioLinee>
        <NumeroLinea>${i + 1}</NumeroLinea>
        <Descrizione>${x(v.descrizione)}</Descrizione>
        <Quantita>${n2(v.quantita)}</Quantita>
        <PrezzoUnitario>${n2(v.prezzoUnitario)}</PrezzoUnitario>
        <PrezzoTotale>${n2(v.totale)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
      </DettaglioLinee>`).join('');

  const bolloXml = fattura.importoBollo > 0
    ? `\n        <DatiBollo>\n          <BolloVirtuale>SI</BolloVirtuale>\n          <ImportoBollo>${n2(fattura.importoBollo)}</ImportoBollo>\n        </DatiBollo>` : '';

  const ibm = cfg.iban?.trim() ? `\n          <IBAN>${x(cfg.iban)}</IBAN>` : '';

  const provinciaLine = (s: string) => s?.trim() ? `\n        <Provincia>${x(s)}</Provincia>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${x(idTrasmittente)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${x(progressivo)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${x(sdiCode)}</CodiceDestinatario>${pecLine}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${x(cfg.partitaIva)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${x(cfg.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          ${cedenteAnagrafica}
        </Anagrafica>
        <RegimeFiscale>${x(cfg.regimeFiscale || 'RF19')}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${x(cfg.indirizzo)}</Indirizzo>
        <CAP>${x(cfg.cap)}</CAP>
        <Comune>${x(cfg.comune)}</Comune>${provinciaLine(cfg.provincia)}
        <Nazione>${x(cfg.paese || 'IT')}</Nazione>
      </Sede>${cfg.email?.trim() ? `\n      <Contatti>\n        <Email>${x(cfg.email)}</Email>\n      </Contatti>` : ''}
    </CedentePrestatore>
    <CessionarioCommittente>${cessAnag}
      <Sede>
        <Indirizzo>${x(dest.indirizzo || 'N/D')}</Indirizzo>
        <CAP>${x(dest.cap || '00000')}</CAP>
        <Comune>${x(dest.comune || 'N/D')}</Comune>${provinciaLine(dest.provincia)}
        <Nazione>${x(dest.paese || 'IT')}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${fmtDate(fattura.data)}</Data>
        <Numero>${fattura.numero}</Numero>${bolloXml}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>${linee}
      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>N2.2</Natura>
        <ImponibileImporto>${n2(fattura.totaleImponibile)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>Regime Forfettario ex art. 1, c. 54-89, L. 190/2014</RiferimentoNormativo>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>${x(fattura.modalitaPagamento || 'MP05')}</ModalitaPagamento>${ibm}
        <ImportoPagamento>${n2(fattura.totale)}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const fattura = await prisma.fattura.findUnique({ where: { id: Number(params.id) } });
  if (!fattura) return NextResponse.json({ error: 'Non trovata' }, { status: 404 });

  let cfg = await prisma.configFiscale.findFirst();
  if (!cfg) cfg = { nome:'', cognome:'', partitaIva:'', codiceFiscale:'', indirizzo:'', cap:'', comune:'', provincia:'', paese:'IT', email:'', pec:'', iban:'', regimeFiscale:'RF19' };

  const xml = buildXml(fattura, cfg);
  const piva = cfg.partitaIva || cfg.codiceFiscale || '00000000000';
  const prog = String(fattura.progressivoInvio ?? fattura.numero).padStart(5, '0');
  const filename = `IT${piva}_${prog}.xml`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
