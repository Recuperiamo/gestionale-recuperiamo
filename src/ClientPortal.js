import React, { useState, useEffect } from 'react';
import { db } from './firebase-config';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function ClientPortal({ user }) {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [highlightedLessonId, setHighlightedLessonId] = useState(null);

  useEffect(() => {
    if (!user || !user.email) return;

    const clientsQuery = query(collection(db, "clients"), where("email", "==", user.email));
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const clientDocData = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        let newNotifications = [];
        let needsUpdate = false;
        let lessonIdToHighlight = null;

        (clientDocData.packages || []).forEach(pkg => {
            (pkg.bookings || []).forEach(booking => {
                if(booking.requests) {
                    Object.entries(booking.requests).forEach(([dateString, request]) => {
                        if(request.resolved && !request.notified) {
                            if (request.notification && request.notification.newBookingId) {
                                lessonIdToHighlight = request.notification.newBookingId;
                            }
                            newNotifications.push(request.notification?.message || `La tua richiesta per la lezione del ${new Date(dateString).toLocaleDateString()} è stata valutata.`);
                            booking.requests[dateString].notified = true;
                            needsUpdate = true;
                        }
                    });
                }
            });
        });

        if(newNotifications.length > 0) {
            setNotifications(newNotifications);
            if (lessonIdToHighlight) {
                setHighlightedLessonId(lessonIdToHighlight);
            }
            if (needsUpdate) {
                const clientDocRef = doc(db, "clients", clientDocData.id);
                updateDoc(clientDocRef, { packages: clientDocData.packages });
            }
        }
        
        setClientData(clientDocData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="loading-screen">Caricamento...</div>;

  if (!clientData) {
    return (
        <div className="App">
            <header className="App-header"><h1>Portale Clienti</h1></header>
            <main>
                <p>Non è stato possibile trovare i tuoi dati. Contatta l'amministratore.</p>
                <button onClick={() => signOut(getAuth())}>Esci</button>
            </main>
        </div>
    );
  }

  const allOccurrences = [];
  (clientData.packages || []).forEach(pkg => {
    (pkg.bookings || []).forEach(booking => {
      const baseInfo = { packageName: pkg.name, hoursBooked: booking.hoursBooked };
      if (booking.type === 'single') {
        const dateString = new Date(booking.dateTime).toISOString().split('T')[0];
        const request = (booking.requests || {})[dateString];
        allOccurrences.push({ ...baseInfo, ...booking, effectiveDate: new Date(booking.dateTime), status: (request && !request.resolved) ? request.status : (new Date(booking.dateTime) < new Date() ? 'Svolta' : 'Da Svolgere') });
      } else {
        const startDate = new Date(booking.startDate);
        const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
        for (let i = 0; i < booking.recurrence.weeks; i++) {
          (booking.recurrence.days || []).forEach(day => {
            const dayOfWeek = dayMap[day];
            const firstDay = new Date(startDate);
            firstDay.setDate(startDate.getDate() + i * 7);
            const d = new Date(firstDay);
            d.setDate(firstDay.getDate() - firstDay.getDay() + dayOfWeek);
            const dateString = d.toISOString().split('T')[0];
            const isCancelled = (booking.cancelledDates || []).includes(dateString);
            const isProcessed = (booking.processedDates || []).includes(dateString);
            const request = (booking.requests || {})[dateString];
            if (!isCancelled) {
              allOccurrences.push({ ...baseInfo, ...booking, effectiveDate: d, isProcessed, status: (request && !request.resolved) ? request.status : (isProcessed ? 'Svolta' : 'Da Svolgere') });
            }
          });
        }
      }
    });
  });
  
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayString = date.toISOString().split('T')[0];
      const lessonsOnDay = allOccurrences.filter(occ => occ.effectiveDate.toISOString().split('T')[0] === dayString);
      if (lessonsOnDay.length > 0) {
        return <div className="calendar-dot-container">{lessonsOnDay.map((_, i) => <div key={i} className="calendar-dot"></div>)}</div>;
      }
    }
    return null;
  };

  const totalCompletedHours = allOccurrences.filter(occ => occ.isProcessed).reduce((sum, occ) => sum + occ.hoursBooked, 0);
  const totalRemainingHours = clientData.packages.reduce((sum, pkg) => sum + pkg.remainingHours, 0);

  return (
    <>
      <style>{`
        body { background-color: #1e3a8a; font-family: 'Source Sans 3', sans-serif; }
        .logo-wrapper { position: relative; border: 2px solid white; border-top: none; padding: 0.75rem 1.5rem; }
        .logo-wrapper::before, .logo-wrapper::after { content: ''; position: absolute; top: 0; height: 2px; background: white; }
        .logo-wrapper::before { left: 0; width: calc(65.5% - 16px); }
        .logo-wrapper::after { right: 0; width: calc(34.5% - 16px); }
        .logo-atom { position: absolute; width: 28px; height: 28px; left: 65.5%; top: -14px; transform: translateX(-50%); }
        .atom-inner { position: relative; width: 100%; height: 100%; background-color: #1e3a8a; padding: 0 4px; border-radius: 50%; }
        .orbit { position: absolute; top: 50%; left: 50%; border: 1px solid white; border-radius: 50%; box-sizing: border-box; }
        .orbit-1 { width: 100%; height: 50%; transform: translate(-50%, -50%); }
        .orbit-2 { width: 100%; height: 50%; transform: translate(-50%, -50%) rotate(60deg); }
        .orbit-3 { width: 100%; height: 50%; transform: translate(-50%, -50%) rotate(-60deg); }
        .nucleus { position: absolute; top: 50%; left: 50%; width: 4px; height: 4px; background-color: white; border-radius: 50%; transform: translate(-50%, -50%); }
        .react-calendar { background: #fff; border: none; border-radius: 0.5rem; color: #333; }
        .react-calendar__tile--active { background: #00aaff; }
        .react-calendar__tile--now { background: #e6f7ff; }
        .calendar-dot-container { display: flex; justify-content: center; gap: 2px; margin-top: 2px; }
        .calendar-dot { width: 5px; height: 5px; background-color: #d32f2f; border-radius: 50%; }
        .highlight-lesson { background-color: #00aaff40; border-radius: 5px; }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-slate-200">
        <header className="text-center py-16 sm:py-20">
            <div className="mb-10 flex flex-col items-center gap-4">
                <div className="relative inline-block">
                    <div className="logo-wrapper">
                        <h2 className="text-4xl font-medium text-white tracking-tighter">
                            Re<sup className="text-2xl -top-2.5 relative">2</sup>CUPERIAMO
                        </h2>
                    </div>
                    <div className="logo-atom">
                        <div className="atom-inner">
                            <span className="orbit orbit-1"></span>
                            <span className="orbit orbit-2"></span>
                            <span className="orbit orbit-3"></span>
                            <span className="nucleus"></span>
                        </div>
                    </div>
                </div>
                <p className="text-lg font-semibold tracking-widest text-white">TUTOR SCOLASTICO</p>
            </div>
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Bentornato, {clientData.name}!</h1>
                <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => signOut(getAuth())}>Esci</button>
            </div>
        </header>

        <main>
          {notifications.map((note, index) => (
            <div key={index} className="bg-blue-900 border border-blue-700 text-blue-100 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <span className="block sm:inline">{note}</span>
            </div>
          ))}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white text-slate-800 p-8 rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-blue-900 mb-4">Calendario Lezioni</h2>
                <Calendar tileContent={tileContent} />
            </div>
            <div className="bg-white text-slate-800 p-8 rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-blue-900 mb-4">Riepilogo Pacchetti</h2>
                {(clientData.packages && clientData.packages.length > 0) ? (
                    clientData.packages.map(pkg => (
                        <div key={pkg.id} className={`mb-6 pb-6 border-b border-slate-200 ${highlightedLessonId === pkg.id ? 'highlight-lesson' : ''}`}>
                            <h3 className="text-xl font-bold text-blue-800">{pkg.name}</h3>
                            <div className="mt-2 space-y-2 text-lg">
                                <p><strong>Ore Totali:</strong> {pkg.totalHours}h</p>
                                <p><strong>Ore Svolte:</strong> {totalCompletedHours}h</p>
                                <p className="font-bold"><strong>Ore Rimanenti:</strong> {totalRemainingHours}h</p>
                            </div>
                        </div>
                    ))
                ) : <p>Nessun pacchetto attivo.</p>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default ClientPortal;