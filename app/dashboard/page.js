'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = ['admin', 'operatore'].includes(session?.user?.role);

  useEffect(() => {
    if (!session) return;
    loadStats();
  }, [session]);

  async function loadStats() {
    try {
      setLoading(true);
      
      // Carica dati in parallelo
      const [attivitaRes, clientiRes, pacchettiRes, richiesteRes] = await Promise.all([
        fetch('/api/attivita'),
        fetch('/api/clienti'),
        fetch('/api/pacchetti'),
        fetch('/api/modifiche')
      ]);

      const attivita = await attivitaRes.json();
      const clienti = await clientiRes.json();
      const pacchetti = await pacchettiRes.json();
      const richieste = await richiesteRes.json();

      // Calcola statistiche
      const now = new Date();
      const oggi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const settimanaFa = new Date(oggi);
      settimanaFa.setDate(settimanaFa.getDate() - 7);
      const meseFa = new Date(oggi);
      meseFa.setMonth(meseFa.getMonth() - 1);

      const attivitaArray = Array.isArray(attivita) ? attivita : [];
      const clientiArray = Array.isArray(clienti) ? clienti : [];
      const pacchettiArray = Array.isArray(pacchetti) ? pacchetti : [];
      const richiesteArray = Array.isArray(richieste.richieste) ? richieste.richieste : [];

      // Filtra attività
      const lezioniOggi = attivitaArray.filter(a => {
        const orario = new Date(a.orario);
        return orario >= oggi && orario < new Date(oggi.getTime() + 24*60*60*1000);
      });

      const lezioniSettimana = attivitaArray.filter(a => {
        const orario = new Date(a.orario);
        return orario >= oggi && orario < new Date(oggi.getTime() + 7*24*60*60*1000);
      });

      const lezioniPassate = attivitaArray.filter(a => {
        const orario = new Date(a.orario);
        return orario < oggi && a.stato !== 'cancellata';
      });

      const lezioniFuture = attivitaArray.filter(a => {
        const orario = new Date(a.orario);
        return orario >= oggi && a.stato !== 'cancellata';
      });

      const lezioniCancellate = attivitaArray.filter(a => a.stato === 'cancellata');

      // Richieste pending
      const richiestePending = richiesteArray.filter(r => 
        ['pending', 'in_review'].includes(r.stato)
      );

      // Pacchetti attivi
      const pacchettiAttivi = pacchettiArray.filter(p => {
        const scadenza = p.scadenza ? new Date(p.scadenza) : null;
        return !scadenza || scadenza > now;
      });

      // Pacchetti con problemi
      const pacchettiEsauriti = pacchettiArray.filter(p => p.oreResidue === 0);
      const pacchettiInEsaurimento = pacchettiArray.filter(p => {
        const sogliaAlert = p.sogliaOreResidue || 5;
        return p.oreResidue > 0 && p.oreResidue <= sogliaAlert;
      });

      // Ore totali erogate ultimo mese
      const oreMese = attivitaArray
        .filter(a => {
          const orario = new Date(a.orario);
          return orario >= meseFa && orario <= now && a.stato !== 'cancellata';
        })
        .reduce((sum, a) => sum + (a.oreConsumate || a.durataOre || 0), 0);

      setStats({
        totaleClienti: clientiArray.length,
        totalePacchetti: pacchettiArray.length,
        pacchettiAttivi: pacchettiAttivi.length,
        pacchettiEsauriti: pacchettiEsauriti,
        pacchettiInEsaurimento: pacchettiInEsaurimento,
        totaleLezioni: attivitaArray.length,
        lezioniOggi: lezioniOggi.length,
        lezioniOggiDettaglio: lezioniOggi, // Aggiungo array completo
        lezioniSettimana: lezioniSettimana.length,
        lezioniFuture: lezioniFuture.length,
        lezioniPassate: lezioniPassate.length,
        lezioniCancellate: lezioniCancellate.length,
        richiestePending: richiestePending.length,
        oreMese: oreMese,
        prossimaLezione: lezioniFuture.sort((a, b) => 
          new Date(a.orario) - new Date(b.orario)
        )[0],
        ultimaLezione: lezioniPassate.sort((a, b) => 
          new Date(b.orario) - new Date(a.orario)
        )[0]
      });
    } catch (e) {
      console.error('Errore caricamento stats:', e);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    router.replace('/profilo');
    return null;
  }

  return (
    <AuthGuard>
      <Navbar />
      <main style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '32px 24px',
        background: '#f8fafc'
      }}>
        <div style={{
          marginBottom: 32
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: 8
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: 16,
            color: '#64748b'
          }}>
            Benvenuto, {session?.user?.name || 'Admin'}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            Caricamento statistiche...
          </div>
        ) : stats ? (
          <>
            {/* Alert Pacchetti in Alto */}
            {(stats.pacchettiEsauriti.length > 0 || stats.pacchettiInEsaurimento.length > 0) && (
              <div style={{ marginBottom: 24 }}>
                {stats.pacchettiEsauriti.length > 0 && (
                  <div style={{
                    background: '#fee2e2',
                    border: '2px solid #ef4444',
                    borderRadius: 8,
                    padding: '16px 20px',
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>🚨</span>
                      <h3 style={{ margin: 0, color: '#b91c1c', fontWeight: 700, fontSize: 16 }}>
                        Pacchetti Esauriti ({stats.pacchettiEsauriti.length})
                      </h3>
                    </div>
                    <div style={{ fontSize: 14, color: '#7f1d1d', lineHeight: 1.6 }}>
                      {stats.pacchettiEsauriti.map(p => (
                        <div key={p.id} style={{ marginBottom: 4 }}>
                          📦 <b>{p.descrizione}</b> - Cliente: {p.cliente?.nomeReferente || p.cliente?.email}
                        </div>
                      ))}
                      <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                        Contattare i referenti per rinnovo pacchetto
                      </div>
                    </div>
                  </div>
                )}

                {stats.pacchettiInEsaurimento.length > 0 && (
                  <div style={{
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: 8,
                    padding: '16px 20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>⚠️</span>
                      <h3 style={{ margin: 0, color: '#92400e', fontWeight: 700, fontSize: 16 }}>
                        Pacchetti in Esaurimento ({stats.pacchettiInEsaurimento.length})
                      </h3>
                    </div>
                    <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.6 }}>
                      {stats.pacchettiInEsaurimento.map(p => (
                        <div key={p.id} style={{ marginBottom: 4 }}>
                          📦 <b>{p.descrizione}</b> - Ore residue: <b style={{ color: '#f59e0b' }}>{p.oreResidue}</b> - Cliente: {p.cliente?.nomeReferente || p.cliente?.email}
                        </div>
                      ))}
                      <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                        Ore limitate, considerare di contattare i referenti
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Statistiche Principali */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
              marginBottom: 32
            }}>
              <StatCard
                title="Clienti Totali"
                value={stats.totaleClienti}
                icon="�"
                color="#3b82f6"
                link="/clienti"
              />
              <StatCard
                title="Pacchetti Attivi"
                value={`${stats.pacchettiAttivi}/${stats.totalePacchetti}`}
                icon="📦"
                color="#10b981"
                link="/pacchetti"
              />
              <StatCard
                title="Richieste Pending"
                value={stats.richiestePending}
                icon="⚠️"
                color="#ef4444"
                link="/richieste"
                highlight={stats.richiestePending > 0}
              />
            </div>

            {/* Grafici e Dettagli */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: 24,
              marginBottom: 32
            }}>
              {/* Lezioni del Giorno */}
              <Card title="Prossime Lezioni (Oggi)">
                {stats.lezioniOggiDettaglio && stats.lezioniOggiDettaglio.length > 0 ? (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {stats.lezioniOggiDettaglio
                      .sort((a, b) => new Date(a.orario) - new Date(b.orario))
                      .map((lez, idx) => (
                        <div key={lez.id} style={{
                          padding: '12px',
                          background: idx % 2 === 0 ? '#f8fafc' : '#fff',
                          borderLeft: '3px solid #f59e0b',
                          marginBottom: 8,
                          borderRadius: 4
                        }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                            🕐 {new Date(lez.orario).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b' }}>
                            {lez.descrizione || `Lezione #${lez.id}`}
                          </div>
                          {lez.cliente && (
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                              👤 {lez.cliente.nomeReferente || lez.cliente.email}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    Nessuna lezione programmata per oggi
                  </div>
                )}
              </Card>

              {/* Ore Erogate */}
              <Card title="Ore Erogate">
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, fontWeight: 700, color: '#3b82f6' }}>
                    {stats.oreMese.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
                    Ore nell'ultimo mese
                  </div>
                </div>
              </Card>
            </div>

            {/* Sezione Note */}
            <Card title="Note e Promemoria">
              <div style={{ padding: 12 }}>
                <textarea
                  placeholder="Aggiungi note, promemoria o informazioni importanti..."
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 12,
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    background: '#f8fafc'
                  }}
                  defaultValue={localStorage?.getItem('dashboard-notes') || ''}
                  onChange={(e) => localStorage?.setItem('dashboard-notes', e.target.value)}
                />
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
                  Le note vengono salvate automaticamente nel browser
                </div>
              </div>
            </Card>

            {/* Link Rapidi */}
            <Card title="Azioni Rapide">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12
              }}>
                <QuickLink href="/attivita" icon="➕" label="Crea Nuova Lezione" />
                <QuickLink href="/clienti" icon="👤" label="Gestisci Clienti" />
                <QuickLink href="/pacchetti" icon="📦" label="Gestisci Pacchetti" />
                <QuickLink href="/calendario" icon="📅" label="Visualizza Calendario" />
                <QuickLink href="/richieste" icon="📋" label="Vedi Richieste" />
                <QuickLink href="/storico" icon="📊" label="Storico Attività" />
              </div>
            </Card>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            Errore nel caricamento delle statistiche
          </div>
        )}
      </main>
    </AuthGuard>
  );
}

function StatCard({ title, value, icon, color, link, highlight, alert }) {
  const card = (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      position: 'relative',
      boxShadow: highlight 
        ? '0 4px 6px -1px rgba(239, 68, 68, 0.2), 0 2px 4px -1px rgba(239, 68, 68, 0.1)'
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      border: highlight ? '2px solid #ef4444' : 'none',
      cursor: link ? 'pointer' : 'default',
      transition: 'all 0.2s',
      ':hover': link ? { transform: 'translateY(-2px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : {}
    }}>
      {alert && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: '#ef4444',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          Alert
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 32 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: color }}>
        {value}
      </div>
    </div>
  );

  return link ? <Link href={link} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

function Card({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 600,
        color: '#1e293b',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '2px solid #e2e8f0'
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value, color = '#1e293b' }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #f1f5f9'
    }}>
      <span style={{ fontSize: 14, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function QuickLink({ href, icon, label }) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: '#f8fafc',
      borderRadius: 8,
      textDecoration: 'none',
      color: '#1e293b',
      fontWeight: 500,
      fontSize: 14,
      transition: 'all 0.2s',
      border: '1px solid #e2e8f0'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = '#3b82f6';
      e.currentTarget.style.color = '#fff';
      e.currentTarget.style.borderColor = '#3b82f6';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = '#f8fafc';
      e.currentTarget.style.color = '#1e293b';
      e.currentTarget.style.borderColor = '#e2e8f0';
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

