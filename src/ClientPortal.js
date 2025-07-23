import React, { useState, useEffect } from 'react';
import { db } from './firebase-config';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";

function ClientPortal({ user }) {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [requestForm, setRequestForm] = useState(null);
  const [requestDetails, setRequestDetails] = useState({ type: 'sposta', newDate: '', newTime: '', availability: {} });
  
  const auth = getAuth();

  useEffect(() => {
    if (!user || !user.email) return;
    const clientsQuery = query(collection(db, "clients"), where("email", "==", user.email));
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const clientDoc = snapshot.docs[0];
        setClientData({ ...clientDoc.data(), id: clientDoc.id });
      } else {
        console.log("Nessun cliente trovato con questa email.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleRequestChangeClick = (occurrence) => {
    const now = new Date();
    const lessonDate = occurrence.effectiveDate;
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

    if (lessonDate - now < threeDaysInMs) {
      const message = "Oh-oh, sembra che tu sia arrivato/a in ritardo. Lo spostamento della lezione è garantito solo fino a 4 giorni prima. Farò il possibile per soddisfare la tua richiesta ma, nel caso non mi fosse possibile per mancanza di disponibilità, la lezione sarà considerata svolta come da regola concordata.\n\nSe vuoi comunque proseguire, premi 'OK'.";
      
      if (window.confirm(message)) {
        submitUrgentRequest(occurrence);
      }
    } else {
      setRequestForm(occurrence);
      setRequestDetails({ type: 'sposta', newDate: '', newTime: '', availability: {} });
    }
  };
  
  const submitUrgentRequest = async (occurrence) => {
    const newStatus = 'Richiesta Urgente (meno di 3gg)';
    const dateString = occurrence.effectiveDate.toISOString().split('T')[0];
    
    const clientDocRef = doc(db, "clients", clientData.id);
    const newPackages = clientData.packages.map(pkg => {
      if (pkg.id === occurrence.packageId) {
        const newBookings = pkg.bookings.map(b => {
          if (b.id === occurrence.bookingId) {
            const newRequests = { ...(b.requests || {}), [dateString]: { status: newStatus } };
            return { ...b, requests: newRequests };
          }
          return b;
        });
        return { ...pkg, bookings: newBookings };
      }
      return pkg;
    });
    await updateDoc(clientDocRef, { packages: newPackages });
  };


  const handleAvailabilityChange = (dateString, field, value) => {
    const currentAvailability = { ...requestDetails.availability };
    
    if (field === 'day') {
      if (currentAvailability[dateString]) {
        delete currentAvailability[dateString]; // Deseleziona il giorno
      } else {
        currentAvailability[dateString] = { from: '', to: '' }; // Seleziona il giorno
      }
    } else {
      // Se si modifica un orario
      currentAvailability[dateString][field] = value;
    }
    
    setRequestDetails({...requestDetails, availability: currentAvailability});
  };

  const handleSubmitRequestChange = async (e) => {
    e.preventDefault();
    
    const occurrence = requestForm;
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const isUrgent7Days = (occurrence.effectiveDate - new Date() < sevenDaysInMs);
    
    let newStatus = '';
    let changeDetails = { type: requestDetails.type };

    if (requestDetails.type === 'cancella') {
        newStatus = 'Cancellazione Richiesta';
    } else {
        if (isUrgent7Days) {
            const availableSlots = Object.entries(requestDetails.availability);
            if (availableSlots.length === 0 || availableSlots.some(([_, times]) => !times.from || !times.to)) {
                alert('Per favore, seleziona almeno un giorno e compila entrambi gli orari.');
                return;
            }
            const formattedDates = availableSlots.map(([date, times]) => 
                `${new Date(date).toLocaleDateString()} (dalle ${times.from} alle ${times.to})`
            ).join('; ');
            newStatus = `Spostamento Urgente Richiesto (Disponibile: ${formattedDates})`;
            changeDetails.availability = requestDetails.availability;
        } else {
            if (!requestDetails.newDate || !requestDetails.newTime) {
                alert('Per favore, inserisci una nuova data e ora.');
                return;
            }
            const newDateTime = new Date(`${requestDetails.newDate}T${requestDetails.newTime}`);
            newStatus = `Spostamento Richiesto a: ${newDateTime.toLocaleDateString()} ore ${newDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            changeDetails.newDateTime = newDateTime.toISOString();
        }
    }

    if (isUrgent7Days && requestDetails.type !== 'cancella') {
      newStatus += ' (Urgente)';
    }

    const dateString = occurrence.effectiveDate.toISOString().split('T')[0];
    const clientDocRef = doc(db, "clients", clientData.id);
    const newPackages = clientData.packages.map(pkg => {
      if (pkg.id === occurrence.packageId) {
        const newBookings = pkg.bookings.map(b => {
          if (b.id === occurrence.bookingId) {
            const newRequests = { ...(b.requests || {}), [dateString]: { status: newStatus, details: changeDetails } };
            return { ...b, requests: newRequests };
          }
          return b;
        });
        return { ...pkg, bookings: newBookings };
      }
      return pkg;
    });

    await updateDoc(clientDocRef, { packages: newPackages });
    setRequestForm(null);
  };

  if (loading) return <div>Caricamento in corso...</div>;

  if (!clientData) {
    return (
        <div className="App">
            <header className="App-header"><h1>Portale Clienti</h1></header>
            <main>
                <p>Non è stato possibile trovare i tuoi dati. Contatta l'amministratore.</p>
                <button onClick={() => signOut(auth)}>Esci</button>
            </main>
        </div>
    );
  }
  
  const getAvailableDays = (lessonDate) => {
    const days = [];
    let today = new Date();
    today.setDate(today.getDate() + 1);
    today.setHours(0,0,0,0);
    while (today < lessonDate) {
        days.push(new Date(today));
        today.setDate(today.getDate() + 1);
    }
    return days;
  };

  // Calcola il numero di richieste in sospeso per questo cliente
  let pendingRequestsCount = 0;
  if (clientData && clientData.packages) {
      clientData.packages.forEach(pkg => {
          (pkg.bookings || []).forEach(booking => {
              if(booking.requests) {
                  pendingRequestsCount += Object.keys(booking.requests).length;
              }
          });
      });
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Ciao, {clientData.name}!</h1>
        <button onClick={() => signOut(auth)}>Esci</button>
      </header>
      <main>
        <h2>I Tuoi Pacchetti Ore</h2>
        <ul className="package-list">
            {(clientData.packages || []).map(pkg => {
                const allOccurrences = [];
                (pkg.bookings || []).forEach(booking => {
                    const baseBookingInfo = { packageId: pkg.id, bookingId: booking.id, hoursBooked: booking.hoursBooked, type: booking.type, requests: booking.requests };
                    if (booking.type === 'single') {
                        allOccurrences.push({ ...baseBookingInfo, ...booking, uniqueId: booking.id, effectiveDate: new Date(booking.dateTime) });
                    } else {
                        const startDate = new Date(booking.startDate);
                        const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
                        for (let i = 0; i < booking.recurrence.weeks; i++) {
                            (booking.recurrence.days || []).forEach(day => {
                                const dayOfWeek = dayMap[day];
                                const firstDayOfRecurrenceWeek = new Date(startDate);
                                firstDayOfRecurrenceWeek.setDate(startDate.getDate() + (i * 7));
                                const occurrenceDate = new Date(firstDayOfRecurrenceWeek);
                                occurrenceDate.setDate(firstDayOfRecurrenceWeek.getDate() - firstDayOfRecurrenceWeek.getDay() + dayOfWeek);
                                const uniqueId = `${booking.id}-${occurrenceDate.toISOString()}`;
                                allOccurrences.push({
                                    ...baseBookingInfo,
                                    ...booking,
                                    uniqueId: uniqueId,
                                    effectiveDate: occurrenceDate,
                                    isProcessed: (booking.processedDates || []).includes(occurrenceDate.toISOString().split('T')[0]),
                                    isCancelled: (booking.cancelledDates || []).includes(occurrenceDate.toISOString().split('T')[0])
                                });
                            });
                        }
                    }
                });
                allOccurrences.sort((a, b) => a.effectiveDate - b.effectiveDate);
                const visibleOccurrences = allOccurrences.filter(occ => !occ.isCancelled);
                const totalCompletedHours = visibleOccurrences.filter(occ => occ.isProcessed).reduce((sum, occ) => sum + occ.hoursBooked, 0);

                return (
                    <li key={pkg.id} className="package-item">
                        <div className="package-details">
                            <span>{pkg.name}</span>
                            <span>Ore Totali: {pkg.totalHours}h</span>
                            <span>Ore Svolte: {totalCompletedHours}h</span>
                            <span>Ore Rimanenti: {pkg.remainingHours}h</span>
                        </div>
                        <ul className="booking-list">
                            <h3>Le Tue Lezioni</h3>
                            {pendingRequestsCount >= 2 && <p className="warning-message">Hai 2 richieste in sospeso. Attendi una risposta prima di inviarne altre.</p>}
                            {visibleOccurrences.map(occurrence => {
                                const startTime = occurrence.effectiveDate;
                                const isPast = startTime < new Date();
                                const isCancellable = (startTime - new Date()) > (7 * 24 * 60 * 60 * 1000);
                                const isUrgent7Days = (startTime - new Date()) < (7 * 24 * 60 * 60 * 1000);
                                const dateString = startTime.toISOString().split('T')[0];
                                const requestStatus = (occurrence.requests || {})[dateString]?.status;

                                return (
                                <React.Fragment key={occurrence.uniqueId}>
                                    <li className="booking-item">
                                        <span>Data: {startTime.toLocaleDateString()}</span>
                                        <span>Inizio: {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span>Stato: {requestStatus || (occurrence.isProcessed ? 'Svolta' : 'Da Svolgere')}</span>
                                        {!isPast && !requestStatus && pendingRequestsCount < 2 && (
                                            <button onClick={() => handleRequestChangeClick(occurrence)}>Richiedi Modifica</button>
                                        )}
                                    </li>
                                    {requestForm && requestForm.uniqueId === occurrence.uniqueId && (
                                        <li className="booking-form-container">
                                            <form onSubmit={handleSubmitRequestChange} className="booking-form">
                                                <h4>Richiedi Modifica Lezione</h4>
                                                <div>
                                                    <label><input type="radio" value="sposta" checked={requestDetails.type === 'sposta'} onChange={(e) => setRequestDetails({...requestDetails, type: e.target.value})} />Sposta</label>
                                                    {isCancellable && (
                                                        <label><input type="radio" value="cancella" checked={requestDetails.type === 'cancella'} onChange={(e) => setRequestDetails({...requestDetails, type: e.target.value})} />Cancella</label>
                                                    )}
                                                </div>
                                                
                                                {requestDetails.type === 'sposta' && (
                                                    isUrgent7Days ? (
                                                        <div className="days-selector">
                                                            <p>Seleziona i giorni e gli orari in cui saresti disponibile:</p>
                                                            {getAvailableDays(startTime).map(day => {
                                                                const dayString = day.toISOString().split('T')[0];
                                                                const isChecked = requestDetails.availability[dayString];
                                                                return (
                                                                    <div key={dayString}>
                                                                        <label>
                                                                            <input type="checkbox" checked={!!isChecked} onChange={() => handleAvailabilityChange(dayString, 'day')} />
                                                                            {day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                        </label>
                                                                        {isChecked && (
                                                                            <>
                                                                                dalle <input type="time" value={requestDetails.availability[dayString]?.from || ''} onChange={(e) => handleAvailabilityChange(dayString, 'from', e.target.value)} required/>
                                                                                alle <input type="time" value={requestDetails.availability[dayString]?.to || ''} onChange={(e) => handleAvailabilityChange(dayString, 'to', e.target.value)} required/>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <input type="date" value={requestDetails.newDate} onChange={(e) => setRequestDetails({...requestDetails, newDate: e.target.value})} required />
                                                            <input type="time" value={requestDetails.newTime} onChange={(e) => setRequestDetails({...requestDetails, newTime: e.target.value})} required />
                                                        </>
                                                    )
                                                )}
                                                
                                                <button type="submit">Invia Richiesta</button>
                                                <button type="button" onClick={() => setRequestForm(null)}>Annulla</button>
                                            </form>
                                        </li>
                                    )}
                                </React.Fragment>
                                );
                            })}
                        </ul>
                    </li>
                );
            })}
        </ul>
      </main>
    </div>
  );
}

export default ClientPortal;