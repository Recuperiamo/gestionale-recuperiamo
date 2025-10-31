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
        totaleLezioni: attivitaArray.length,
        lezioniOggi: lezioniOggi.length,
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
                icon="👥"
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
                title="Lezioni Oggi"
                value={stats.lezioniOggi}
                icon="📅"
                color="#f59e0b"
                link="/calendario"
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
              {/* Lezioni Overview */}
              <Card title="Panoramica Lezioni">
                <InfoRow label="Totale Lezioni" value={stats.totaleLezioni} />
                <InfoRow label="Lezioni Future" value={stats.lezioniFuture} color="#10b981" />
                <InfoRow label="Lezioni Passate" value={stats.lezioniPassate} color="#64748b" />
                <InfoRow label="Lezioni Cancellate" value={stats.lezioniCancellate} color="#ef4444" />
                <InfoRow label="Prossima Settimana" value={stats.lezioniSettimana} color="#3b82f6" />
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

            {/* Prossime Lezioni */}
            {stats.prossimaLezione && (
              <Card title="Prossima Lezione">
                <div style={{
                  padding: 16,
                  background: '#f1f5f9',
                  borderRadius: 8,
                  borderLeft: '4px solid #3b82f6'
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                    {stats.prossimaLezione.descrizione || `Lezione #${stats.prossimaLezione.id}`}
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    📅 {new Date(stats.prossimaLezione.orario).toLocaleString('it-IT', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {stats.prossimaLezione.cliente && (
                    <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                      👤 {stats.prossimaLezione.cliente.nomeReferente || stats.prossimaLezione.cliente.email}
                    </div>
                  )}
                </div>
              </Card>
            )}

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

function StatCard({ title, value, icon, color, link, highlight }) {
  const card = (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: highlight 
        ? '0 4px 6px -1px rgba(239, 68, 68, 0.2), 0 2px 4px -1px rgba(239, 68, 68, 0.1)'
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      border: highlight ? '2px solid #ef4444' : 'none',
      cursor: link ? 'pointer' : 'default',
      transition: 'all 0.2s',
      ':hover': link ? { transform: 'translateY(-2px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } : {}
    }}>
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

