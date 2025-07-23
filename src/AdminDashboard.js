import React, { useState, useEffect } from 'react';
import { db } from './firebase-config';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";
import DashboardSummary from './DashboardSummary';

function RequestManager({ clients, onUpdateRequest }) {
    const allRequests = [];
    clients.forEach(client => {
        (client.packages || []).forEach(pkg => {
            (pkg.bookings || []).forEach(booking => {
                if (booking.requests) {
                    Object.entries(booking.requests).forEach(([dateString, request]) => {
                        if (request.status && !request.resolved) {
                            allRequests.push({ client, pkg, booking, dateString, request });
                        }
                    });
                }
            });
        });
    });

    if (allRequests.length === 0) {
        return <h2>Nessuna Richiesta di Modifica</h2>;
    }

    return (
        <div className="request-manager">
            <h2>Richieste di Modifica in Sospeso</h2>
            <ul>
                {allRequests.map(({ client, pkg, booking, dateString, request }) => {
                    const key = `${client.id}-${pkg.id}-${booking.id}-${dateString}`;
                    return (
                        <li key={key} className="request-item">
                            <span><strong>Cliente:</strong> {client.name}</span>
                            <span><strong>Lezione del:</strong> {new Date(dateString).toLocaleDateString()}</span>
                            <span><strong>Richiesta:</strong> {request.status}</span>
                            <div>
                                <button onClick={() => onUpdateRequest(client.id, pkg.id, booking.id, dateString, 'approved')}>Approva</button>
                                <button onClick={() => onUpdateRequest(client.id, pkg.id, booking.id, dateString, 'rejected')}>Rifiuta</button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function AdminDashboard() {
  const [clients, setClients] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [bookingForm, setBookingForm] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageFormClientId, setPackageFormClientId] = useState(null);
  const [newPackageDetails, setNewPackageDetails] = useState({ name: '', totalHours: '' });
  const [bookingType, setBookingType] = useState('single');
  const [bookingDetails, setBookingDetails] = useState({ date: '', time: '', hours: 1, weeks: 4, days: [] });
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOccurrence, setEditingOccurrence] = useState(null);

  const clientsCollectionRef = collection(db, "clients");
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsubscribe();
  }, [clientsCollectionRef]);

  useEffect(() => {
    const processBookings = () => {
      clients.forEach(client => {
        const originalClientData = JSON.parse(JSON.stringify(client));
        let clientWasUpdated = false;

        const updatedPackages = (client.packages || []).map(pkg => {
          const newBookings = (pkg.bookings || []).map(booking => {
            let tempBooking = { ...booking };
            const now = new Date();
            if (tempBooking.type === 'single' && !tempBooking.isProcessed && new Date(tempBooking.dateTime) < now) {
              const dateString = new Date(tempBooking.dateTime).toISOString().split('T')[0];
              if (!tempBooking.requests || !tempBooking.requests[dateString]) {
                tempBooking.isProcessed = true;
                clientWasUpdated = true;
              }
            } else if (tempBooking.type === 'recurring') {
              const startDate = new Date(tempBooking.startDate);
              const newProcessedDates = new Set(tempBooking.processedDates || []);
              let recurringUpdated = false;
              for (let i = 0; i < tempBooking.recurrence.weeks; i++) {
                (tempBooking.recurrence.days || []).forEach(day => {
                  const dayOfWeek = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 }[day];
                  const firstDayOfWeek = new Date(startDate);
                  firstDayOfWeek.setDate(startDate.getDate() + i * 7);
                  const d = new Date(firstDayOfWeek);
                  d.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay() + dayOfWeek);
                  const dateString = d.toISOString().split('T')[0];
                  const isCancelled = (tempBooking.cancelledDates || []).includes(dateString);
                  const hasRequest = tempBooking.requests && tempBooking.requests[dateString];
                  if (!isCancelled && !hasRequest && d < now && !newProcessedDates.has(dateString)) {
                    newProcessedDates.add(dateString);
                    recurringUpdated = true;
                  }
                });
              }
              if (recurringUpdated) {
                tempBooking.processedDates = Array.from(newProcessedDates);
                clientWasUpdated = true;
              }
            }
            return tempBooking;
          });
          
          let completedHours = 0;
          newBookings.forEach(b => {
            if(b.type === 'single' && b.isProcessed) completedHours += b.hoursBooked;
            if(b.type === 'recurring') {
                const processedAndNotCancelled = (b.processedDates || []).filter(d => !(b.cancelledDates || []).includes(d));
                completedHours += processedAndNotCancelled.length * b.hoursBooked;
            }
          });
          
          return { ...pkg, bookings: newBookings, remainingHours: pkg.totalHours - completedHours };
        });

        if (clientWasUpdated) {
          const clientDoc = doc(db, "clients", client.id);
          updateDoc(clientDoc, { packages: updatedPackages });
        }
      });
    };
    const intervalId = setInterval(processBookings, 60000);
    return () => clearInterval(intervalId);
  }, [clients]);

  const handleAddClient = async (e) => { e.preventDefault(); if (!newClientName.trim()) return; await addDoc(clientsCollectionRef, { name: newClientName, email: newClientEmail, packages: [] }); setNewClientName(''); setNewClientEmail(''); };
  const handleDeleteClient = async (clientId) => { if (window.confirm('Sei sicuro?')) await deleteDoc(doc(db, "clients", clientId)); };
  const handleUpdateClient = async (e) => { e.preventDefault(); if (!editingClient || !editingClient.name.trim()) return; const clientDoc = doc(db, "clients", editingClient.id); await updateDoc(clientDoc, { name: editingClient.name, email: editingClient.email || '' }); setEditingClient(null); };
  const showPackageForm = (clientId) => setPackageFormClientId(clientId);
  const handleAddPackage = async (e, clientId) => { e.preventDefault(); const clientToUpdate = clients.find(c => c.id === clientId); if (!clientToUpdate) return; const newPackage = { id: Date.now(), name: newPackageDetails.name, totalHours: parseFloat(newPackageDetails.totalHours), remainingHours: parseFloat(newPackageDetails.totalHours), bookings: [] }; const newPackages = [...(clientToUpdate.packages || []), newPackage]; await updateDoc(doc(db, "clients", clientId), { packages: newPackages }); setPackageFormClientId(null); setNewPackageDetails({ name: '', totalHours: '' }); };
  const handleUpdatePackage = async (e, clientId, packageId) => { e.preventDefault(); const clientToUpdate = clients.find(c => c.id === clientId); if (!clientToUpdate) return; const newPackages = clientToUpdate.packages.map(pkg => { if (pkg.id === packageId) { const hourDifference = parseFloat(editingPackage.totalHours) - pkg.totalHours; const newRemainingHours = pkg.remainingHours + hourDifference; return { ...pkg, ...editingPackage, remainingHours: newRemainingHours }; } return pkg; }); await updateDoc(doc(db, "clients", clientId), { packages: newPackages }); setEditingPackage(null); };
  const handleDeletePackage = async (clientId, packageId) => { if (!window.confirm('Sei sicuro?')) return; const clientToUpdate = clients.find(c => c.id === clientId); if (!clientToUpdate) return; const newPackages = clientToUpdate.packages.filter(pkg => pkg.id !== packageId); await updateDoc(doc(db, "clients", clientId), { packages: newPackages }); };
  const handleAddBooking = async (e, clientId, packageId) => { e.preventDefault(); const clientToUpdate = clients.find(c => c.id === clientId); if (!clientToUpdate) return; const pkg = clientToUpdate.packages.find(p => p.id === packageId); if (!pkg) return; let newBooking; const hours = parseFloat(bookingDetails.hours); const startDate = `${bookingDetails.date}T${bookingDetails.time}`; if (bookingType === 'single') { newBooking = { id: Date.now(), type: 'single', dateTime: startDate, hoursBooked: hours, isProcessed: false, requests: {} }; } else { if (bookingDetails.days.length === 0) return alert('Seleziona un giorno.'); newBooking = { id: Date.now(), type: 'recurring', startDate, hoursBooked: hours, recurrence: { weeks: parseInt(bookingDetails.weeks), days: bookingDetails.days }, processedDates: [], cancelledDates: [], requests: {} }; } const totalHoursToBook = bookingType === 'recurring' ? hours * newBooking.recurrence.weeks * newBooking.recurrence.days.length : hours; if (pkg.remainingHours < totalHoursToBook) return alert('Ore insufficienti.'); const newPackages = clientToUpdate.packages.map(p => { if (p.id === packageId) { return { ...p, bookings: [...(p.bookings || []), newBooking] }; } return p; }); await updateDoc(doc(db, "clients", clientId), { packages: newPackages }); setBookingForm(null); };
  const handleDeleteOccurrence = async (clientId, packageId, occurrence) => { if (!window.confirm(`Eliminare la lezione del ${occurrence.effectiveDate.toLocaleDateString()}?`)) return; const clientToUpdate = JSON.parse(JSON.stringify(clients.find(c => c.id === clientId))); if (!clientToUpdate) return; const pkg = clientToUpdate.packages.find(p => p.id === packageId); if (!pkg) return; if (occurrence.type === 'single') { pkg.bookings = pkg.bookings.filter(b => b.id !== occurrence.bookingId); } else { const bookingToUpdate = pkg.bookings.find(b => b.id === occurrence.bookingId); if (bookingToUpdate) { const cancelledDateString = occurrence.effectiveDate.toISOString().split('T')[0]; bookingToUpdate.cancelledDates = [...new Set([...(bookingToUpdate.cancelledDates || []), cancelledDateString])]; } } let newCompletedHours = 0; (pkg.bookings || []).forEach(b => { if (b.type === 'single' && b.isProcessed) { newCompletedHours += b.hoursBooked; } else if (b.type === 'recurring') { const processedAndNotCancelled = (b.processedDates || []).filter(d => !(b.cancelledDates || []).includes(d)); newCompletedHours += processedAndNotCancelled.length * b.hoursBooked; } }); pkg.remainingHours = pkg.totalHours - newCompletedHours; await updateDoc(doc(db, "clients", clientId), { packages: clientToUpdate.packages }); };
  const handleUpdateRequest = async (clientId, packageId, bookingId, dateString, resolution) => { const clientToUpdate = JSON.parse(JSON.stringify(clients.find(c => c.id === clientId))); if(!clientToUpdate) return; const pkg = clientToUpdate.packages.find(p => p.id === packageId); const booking = pkg.bookings.find(b => b.id === bookingId); const request = (booking.requests || {})[dateString]; if(!request) return; if(resolution === 'rejected') { delete booking.requests[dateString]; } else if (resolution === 'approved') { if(request.status.includes('Cancellazione')){ if(booking.type === 'single'){ pkg.bookings = pkg.bookings.filter(b => b.id !== bookingId); } else { booking.cancelledDates = [...(booking.cancelledDates || []), dateString]; delete booking.requests[dateString]; } } else { delete booking.requests[dateString]; } } let newCompletedHours = 0; (pkg.bookings || []).forEach(b => { if (b.type === 'single' && b.isProcessed) newCompletedHours += b.hoursBooked; else if (b.type === 'recurring') { const processedAndNotCancelled = (b.processedDates || []).filter(d => !(b.cancelledDates || []).includes(d)); newCompletedHours += processedAndNotCancelled.length * b.hoursBooked; } }); pkg.remainingHours = pkg.totalHours - newCompletedHours; await updateDoc(doc(db, "clients", clientId), { packages: clientToUpdate.packages }); };
  const showBookingForm = (packageId) => { setBookingForm(packageId); setBookingDetails({ date: '', time: '', hours: 1, weeks: 4, days: [] }); setBookingType('single'); };
  const handleDayChange = (day) => { const currentDays = bookingDetails.days; if (currentDays.includes(day)) { setBookingDetails({ ...bookingDetails, days: currentDays.filter(d => d !== day) }); } else { setBookingDetails({ ...bookingDetails, days: [...currentDays, day] }); } };
  const handleUpdateOccurrence = async (e, clientId, packageId) => { e.preventDefault(); const clientToUpdate = JSON.parse(JSON.stringify(clients.find(c => c.id === clientId))); if(!clientToUpdate) return; const pkg = clientToUpdate.packages.find(p => p.id === packageId); if(!pkg) return; const newBookings = pkg.bookings.map(b => { if(b.id === editingOccurrence.bookingId) { return { ...b, dateTime: `${editingOccurrence.date}T${editingOccurrence.time}`, hoursBooked: parseFloat(editingOccurrence.hours) }; } return b; }); pkg.bookings = newBookings; await updateDoc(doc(db, "clients", clientId), { packages: clientToUpdate.packages }); setEditingOccurrence(null); };

  const filteredClients = clients.filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  return (
      <div>
        <header className="App-header"><h1>Dashboard Admin</h1><button onClick={() => signOut(auth)}>Esci</button></header>
        <main>
            <DashboardSummary clients={clients} />
            <RequestManager clients={clients} onUpdateRequest={handleUpdateRequest} />
            <form className="add-client-form" onSubmit={handleAddClient}><input type="text" placeholder="Nome nuovo cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} required /><input type="email" placeholder="Email cliente (opzionale)" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} /><button type="submit">Aggiungi Cliente</button></form>
            <div className="client-list">
                <h2>Clienti</h2>
                <div className="search-bar"><input type="text" placeholder="Cerca cliente per nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <ul>
                    {filteredClients.map(client => (
                        <li key={client.id}>
                            {editingClient && editingClient.id === client.id ? ( <form onSubmit={handleUpdateClient} className="edit-client-form"><input type="text" value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} required /><input type="email" placeholder="Email cliente (opzionale)" value={editingClient.email || ''} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} /><button type="submit">Salva Modifiche</button><button type="button" onClick={() => setEditingClient(null)}>Annulla</button></form> ) : ( <div className="client-header"><span>{client.name} {client.email && `(${client.email})`}</span><div><button onClick={() => setEditingClient(client)}>Modifica Cliente</button><button onClick={() => showPackageForm(client.id)}>Aggiungi Pacchetto</button><button onClick={() => handleDeleteClient(client.id)}>Elimina Cliente</button></div></div> )}
                            {packageFormClientId === client.id && ( <form onSubmit={(e) => handleAddPackage(e, client.id)} className="add-package-form"><input type="text" placeholder="Nome pacchetto" value={newPackageDetails.name} onChange={(e) => setNewPackageDetails({...newPackageDetails, name: e.target.value})} required /><input type="number" min="1" placeholder="Ore totali" value={newPackageDetails.totalHours} onChange={(e) => setNewPackageDetails({...newPackageDetails, totalHours: e.target.value})} required /><button type="submit">Crea</button><button type="button" onClick={() => setPackageFormClientId(null)}>Annulla</button></form> )}
                            <ul className="package-list">
                                {(client.packages || []).map(pkg => {
                                    // ... (La logica di calcolo dei saldi è qui dentro, la ometto per brevità)
                                    return (
                                        <li key={pkg.id} className="package-item">
                                            {/* ... (JSX per i dettagli del pacchetto e i vari form) ... */}
                                            <ul className="booking-list">
                                                {allOccurrences.map(occurrence => {
                                                    // ... (logica di visualizzazione singola lezione)
                                                    return (
                                                        <li key={occurrence.uniqueId}>
                                                          { editingOccurrence && editingOccurrence.uniqueId === occurrence.uniqueId ? (
                                                            <form onSubmit={(e) => handleUpdateOccurrence(e, client.id, pkg.id)} className="booking-form">
                                                              <input type="date" value={editingOccurrence.date} onChange={e => setEditingOccurrence({...editingOccurrence, date: e.target.value})} />
                                                              <input type="time" value={editingOccurrence.time} onChange={e => setEditingOccurrence({...editingOccurrence, time: e.target.value})} />
                                                              <input type="number" step="0.1" value={editingOccurrence.hours} onChange={e => setEditingOccurrence({...editingOccurrence, hours: e.target.value})} />
                                                              <button type="submit">Salva</button>
                                                              <button type="button" onClick={() => setEditingOccurrence(null)}>Annulla</button>
                                                            </form>
                                                          ) : (
                                                            <div className="booking-item" style={itemStyle}>
                                                              <span>Data: {startTime.toLocaleDateString()}</span>
                                                              {/* ... (altri span) ... */}
                                                              {occurrence.type === 'single' && !occurrence.isProcessed && <button onClick={() => setEditingOccurrence({uniqueId: occurrence.uniqueId, bookingId: occurrence.bookingId, date: startTime.toISOString().split('T')[0], time: startTime.toTimeString().split(' ')[0].substring(0,5), hours: occurrence.hoursBooked })}>Modifica</button>}
                                                              <button className="delete-btn" onClick={() => handleDeleteOccurrence(client.id, pkg.id, occurrence)}>Elimina</button>
                                                            </div>
                                                          )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>
        </main>
      </div>
  );
}

export default AdminDashboard;