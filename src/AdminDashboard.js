import React, { useState, useEffect } from 'react';
import { db } from './firebase-config';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";
import DashboardSummary from './DashboardSummary';
import RequestManager from './RequestManager';

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
        let clientWasUpdated = false;
        const updatedPackages = (client.packages || []).map(pkg => {
          let wasUpdated = false;
          const newBookings = (pkg.bookings || []).map(booking => {
            let tempBooking = { ...booking };
            if (tempBooking.type === 'single' && !tempBooking.isProcessed && new Date(tempBooking.dateTime) < new Date()) {
              const dateString = new Date(tempBooking.dateTime).toISOString().split('T')[0];
              if (!(tempBooking.requests && tempBooking.requests[dateString])) {
                tempBooking.isProcessed = true;
                wasUpdated = true;
              }
            } else if (tempBooking.type === 'recurring') {
              const startDate = new Date(tempBooking.startDate);
              const newProcessedDates = [...(tempBooking.processedDates || [])];
              let recurringUpdated = false;
              for (let i = 0; i < tempBooking.recurrence.weeks; i++) {
                (tempBooking.recurrence.days || []).forEach(day => {
                  const dayOfWeek = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 }[day];
                  const firstDayOfWeek = new Date(startDate);
                  firstDayOfWeek.setDate(startDate.getDate() + (i * 7));
                  const d = new Date(firstDayOfWeek);
                  d.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay() + dayOfWeek);
                  const dateString = d.toISOString().split('T')[0];
                  const isCancelled = (tempBooking.cancelledDates || []).includes(dateString);
                  const hasRequest = (tempBooking.requests || {})[dateString];
                  if (!isCancelled && !hasRequest && d < new Date() && !newProcessedDates.includes(dateString)) {
                    newProcessedDates.push(dateString);
                    recurringUpdated = true;
                  }
                });
              }
              if (recurringUpdated) {
                tempBooking.processedDates = newProcessedDates;
                wasUpdated = true;
              }
            }
            return tempBooking;
          });

          if (wasUpdated) {
            clientWasUpdated = true;
            let completedHours = 0;
            newBookings.forEach(b => {
              if (b.type === 'single' && b.isProcessed) {
                completedHours += b.hoursBooked;
              } else if (b.type === 'recurring') {
                const processedAndNotCancelled = (b.processedDates || []).filter(d => !(b.cancelledDates || []).includes(d));
                completedHours += processedAndNotCancelled.length * b.hoursBooked;
              }
            });
            const newRemainingHours = pkg.totalHours - completedHours;
            return { ...pkg, bookings: newBookings, remainingHours: newRemainingHours };
          }
          return pkg;
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

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    await addDoc(clientsCollectionRef, {
      name: newClientName,
      email: newClientEmail,
      packages: []
    });
    setNewClientName('');
    setNewClientEmail('');
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente?')) {
      await deleteDoc(doc(db, "clients", clientId));
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editingClient || !editingClient.name.trim()) return;
    const clientDoc = doc(db, "clients", editingClient.id);
    await updateDoc(clientDoc, {
      name: editingClient.name,
      email: editingClient.email || ''
    });
    setEditingClient(null);
  };

  const showPackageForm = (clientId) => {
    setPackageFormClientId(clientId);
  };

  const handleAddPackage = async (e, clientId) => {
    e.preventDefault();
    const clientToUpdate = clients.find(c => c.id === clientId);
    if (!clientToUpdate) return;
    const newPackage = {
      id: Date.now(),
      name: newPackageDetails.name,
      totalHours: parseFloat(newPackageDetails.totalHours),
      remainingHours: parseFloat(newPackageDetails.totalHours),
      bookings: []
    };
    const newPackages = [...(clientToUpdate.packages || []), newPackage];
    await updateDoc(doc(db, "clients", clientId), { packages: newPackages });
    setPackageFormClientId(null);
    setNewPackageDetails({ name: '', totalHours: '' });
  };

  const handleUpdatePackage = async (e, clientId, packageId) => {
    e.preventDefault();
    const clientToUpdate = clients.find(c => c.id === clientId);
    if (!clientToUpdate) return;
    const newPackages = clientToUpdate.packages.map(pkg => {
      if (pkg.id === packageId) {
        const hourDifference = parseFloat(editingPackage.totalHours) - pkg.totalHours;
        const newRemainingHours = pkg.remainingHours + hourDifference;
        return { ...pkg, ...editingPackage, remainingHours: newRemainingHours };
      }
      return pkg;
    });
    await updateDoc(doc(db, "clients", clientId), { packages: newPackages });
    setEditingPackage(null);
  };

  const handleDeletePackage = async (clientId, packageId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo pacchetto?')) return;
    const clientToUpdate = clients.find(c => c.id === clientId);
    if (!clientToUpdate) return;
    const newPackages = clientToUpdate.packages.filter(pkg => pkg.id !== packageId);
    await updateDoc(doc(db, "clients", clientId), { packages: newPackages });
  };

  const handleAddBooking = async (e, clientId, packageId) => {
    e.preventDefault();
    const clientToUpdate = clients.find(c => c.id === clientId);
    if (!clientToUpdate) return;
    const pkg = clientToUpdate.packages.find(p => p.id === packageId);
    if (!pkg) return;
    let newBooking;
    const hours = parseFloat(bookingDetails.hours);
    const startDate = `${bookingDetails.date}T${bookingDetails.time}`;
    if (bookingType === 'single') {
      newBooking = { id: Date.now(), type: 'single', dateTime: startDate, hoursBooked: hours, isProcessed: false, requests: {} };
    } else {
      if (bookingDetails.days.length === 0) return alert('Seleziona almeno un giorno.');
      newBooking = { id: Date.now(), type: 'recurring', startDate, hoursBooked: hours, recurrence: { weeks: parseInt(bookingDetails.weeks, 10), days: bookingDetails.days }, processedDates: [], cancelledDates: [], requests: {} };
    }
    const totalHoursToBook = bookingType === 'recurring' ? hours * newBooking.recurrence.weeks * newBooking.recurrence.days.length : hours;
    if (pkg.remainingHours < totalHoursToBook) return alert('Ore insufficienti.');
    const newPackages = clientToUpdate.packages.map(p => {
      if (p.id === packageId) {
        return { ...p, bookings: [...(p.bookings || []), newBooking] };
      }
      return p;
    });
    await updateDoc(doc(db, "clients", clientId), { packages: newPackages });
    setBookingForm(null);
  };

  const handleDeleteOccurrence = async (clientId, packageId, occurrence) => {
    if (!window.confirm(`Sei sicuro di voler eliminare la lezione del ${occurrence.effectiveDate.toLocaleDateString()}?`)) return;
    const clientToUpdate = JSON.parse(JSON.stringify(clients.find(c => c.id === clientId)));
    if (!clientToUpdate) return;
    const pkg = clientToUpdate.packages.find(p => p.id === packageId);
    if (!pkg) return;
    
    if (occurrence.type === 'single') {
      pkg.bookings = pkg.bookings.filter(b => b.id !== occurrence.bookingId);
    } else {
      const bookingToUpdate = pkg.bookings.find(b => b.id === occurrence.bookingId);
      if (bookingToUpdate) {
        const cancelledDateString = occurrence.effectiveDate.toISOString().split('T')[0];
        bookingToUpdate.cancelledDates = [...new Set([...(bookingToUpdate.cancelledDates || []), cancelledDateString])];
      }
    }

    let newCompletedHours = 0;
    (pkg.bookings || []).forEach(b => {
      if (b.type === 'single' && b.isProcessed) {
        newCompletedHours += b.hoursBooked;
      } else if (b.type === 'recurring') {
        const processedAndNotCancelled = (b.processedDates || []).filter(d => !(b.cancelledDates || []).includes(d));
        newCompletedHours += processedAndNotCancelled.length * b.hoursBooked;
      }
    });
    pkg.remainingHours = pkg.totalHours - newCompletedHours;

    await updateDoc(doc(db, "clients", clientId), { packages: clientToUpdate.packages });
  };
  
  const handleUpdateRequest = async (clientId, packageId, bookingId, dateString, resolution) => {
    const clientToUpdate = JSON.parse(JSON.stringify(clients.find(c => c.id === clientId)));
    if(!clientToUpdate) return;
    const pkg = clientToUpdate.packages.find(p => p.id === packageId);
    const booking = pkg.bookings.find(b => b.id === bookingId);
    const request = (booking.requests || {})[dateString];
    if(!request) return;

    booking.requests[dateString].resolved = true;
    booking.requests[dateString].status = `${resolution === 'approved' ? 'Approvata' : 'Rifiutata'}: ${request.status}`;
    
    if (resolution === 'approved' && request.status.includes('Cancellazione')) {
        if(booking.type === 'single'){
            pkg.bookings = pkg.bookings.filter(b => b.id !== bookingId);
        } else {
            booking.cancelledDates = [...(booking.cancelledDates || []), dateString];
        }
    }
    
    let newCompletedHours = 0;
    (pkg.bookings || []).forEach(b => {
        if (b.type === 'single' && b.isProcessed) newCompletedHours += b.hoursBooked;
        else if (b.type === 'recurring') {
            const processedAndNotCancelled = (b.processedDates || []).filter(d => !(b.cancelledDates || []).includes(d));
            newCompletedHours += processedAndNotCancelled.length * b.hoursBooked;
        }
    });
    pkg.remainingHours = pkg.totalHours - newCompletedHours;

    await updateDoc(doc(db, "clients", clientId), { packages: clientToUpdate.packages });
  };

  const showBookingForm = (packageId) => {
    setBookingForm(packageId);
    setBookingDetails({ date: '', time: '', hours: 1, weeks: 4, days: [] });
    setBookingType('single');
  };

  const handleDayChange = (day) => {
    const currentDays = bookingDetails.days;
    if (currentDays.includes(day)) {
      setBookingDetails({ ...bookingDetails, days: currentDays.filter(d => d !== day) });
    } else {
      setBookingDetails({ ...bookingDetails, days: [...currentDays, day] });
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
      <div>
        <header className="App-header">
            <h1>Dashboard Admin</h1>
            <button onClick={() => signOut(auth)}>Esci</button>
        </header>
        <main>
            <DashboardSummary clients={clients} />
            <RequestManager clients={clients} onUpdateRequest={handleUpdateRequest} />
            <form className="add-client-form" onSubmit={handleAddClient}>
                <input
                    type="text"
                    placeholder="Nome nuovo cliente"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email cliente (opzionale)"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                />
                <button type="submit">Aggiungi Cliente</button>
            </form>
            <div className="client-list">
                <h2>Clienti</h2>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Cerca cliente per nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ul>
                    {filteredClients.map(client => (
                        <li key={client.id}>
                            {editingClient && editingClient.id === client.id ? (
                                <form onSubmit={handleUpdateClient} className="edit-client-form">
                                    <input
                                        type="text"
                                        value={editingClient.name}
                                        onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email cliente (opzionale)"
                                        value={editingClient.email || ''}
                                        onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                                    />
                                    <button type="submit">Salva Modifiche</button>
                                    <button type="button" onClick={() => setEditingClient(null)}>Annulla</button>
                                </form>
                            ) : (
                                <div className="client-header">
                                    <span>{client.name} {client.email && `(${client.email})`}</span>
                                    <div>
                                        <button onClick={() => setEditingClient(client)}>Modifica Cliente</button>
                                        <button onClick={() => showPackageForm(client.id)}>Aggiungi Pacchetto</button>
                                        <button onClick={() => handleDeleteClient(client.id)}>Elimina Cliente</button>
                                    </div>
                                </div>
                            )}
                            {packageFormClientId === client.id && (
                                <form onSubmit={(e) => handleAddPackage(e, client.id)} className="add-package-form">
                                    <input type="text" placeholder="Nome pacchetto" value={newPackageDetails.name} onChange={(e) => setNewPackageDetails({ ...newPackageDetails, name: e.target.value })} required />
                                    <input type="number" min="1" placeholder="Ore totali" value={newPackageDetails.totalHours} onChange={(e) => setNewPackageDetails({ ...newPackageDetails, totalHours: e.target.value })} required />
                                    <button type="submit">Crea</button>
                                    <button type="button" onClick={() => setPackageFormClientId(null)}>Annulla</button>
                                </form>
                            )}
                            <ul className="package-list">
                                {(client.packages || []).map(pkg => {
                                    const allOccurrences = [];
                                    const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
                                    (pkg.bookings || []).forEach(booking => {
                                        const baseBookingInfo = { packageId: pkg.id, bookingId: booking.id, hoursBooked: booking.hoursBooked, type: booking.type, requests: booking.requests };
                                        if (booking.type === 'single') {
                                            allOccurrences.push({ ...baseBookingInfo, ...booking, uniqueId: booking.id, effectiveDate: new Date(booking.dateTime) });
                                        } else {
                                            const startDate = new Date(booking.startDate);
                                            for (let i = 0; i < booking.recurrence.weeks; i++) {
                                                (booking.recurrence.days || []).forEach(day => {
                                                    const dayOfWeek = dayMap[day];
                                                    const firstDayOfRecurrenceWeek = new Date(startDate);
                                                    firstDayOfRecurrenceWeek.setDate(startDate.getDate() + (i * 7));
                                                    const occurrenceDate = new Date(firstDayOfRecurrenceWeek);
                                                    occurrenceDate.setDate(firstDayOfRecurrenceWeek.getDate() - firstDayOfRecurrenceWeek.getDay() + dayOfWeek);
                                                    const uniqueId = `${booking.id}-${occurrenceDate.toISOString()}`;
                                                    allOccurrences.push({ ...baseBookingInfo, ...booking, uniqueId: uniqueId, effectiveDate: occurrenceDate, isProcessed: (booking.processedDates || []).includes(occurrenceDate.toISOString().split('T')[0]), isCancelled: (booking.cancelledDates || []).includes(occurrenceDate.toISOString().split('T')[0]) });
                                                });
                                            }
                                        }
                                    });
                                    allOccurrences.sort((a, b) => a.effectiveDate - b.effectiveDate);
                                    const visibleOccurrences = allOccurrences.filter(occ => !occ.isCancelled);
                                    const totalCompletedHours = visibleOccurrences.filter(occ => occ.isProcessed).reduce((sum, occ) => sum + occ.hoursBooked, 0);
                                    const totalBookedHours = visibleOccurrences.reduce((sum, occ) => sum + occ.hoursBooked, 0);
                                    const bookableHours = pkg.totalHours - totalBookedHours;
                                    const showWarning = pkg.remainingHours < 5 || bookableHours < 5;
                                    return (
                                        <li key={pkg.id} className="package-item">
                                            {editingPackage && editingPackage.id === pkg.id ? (
                                                <form onSubmit={(e) => handleUpdatePackage(e, client.id, pkg.id)} className="edit-package-form">
                                                    <input type="text" value={editingPackage.name} onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })} />
                                                    <input type="number" value={editingPackage.totalHours} onChange={(e) => setEditingPackage({ ...editingPackage, totalHours: e.target.value })} />
                                                    <button type="submit">Salva</button>
                                                    <button type="button" onClick={() => setEditingPackage(null)}>Annulla</button>
                                                </form>
                                            ) : (
                                                <div className="package-details">
                                                    <span>{pkg.name}</span>
                                                    <span>Ore Totali: {pkg.totalHours}h</span>
                                                    <span>Ore Svolte: {totalCompletedHours}h</span>
                                                    <span>Ore Rimanenti: {pkg.remainingHours}h</span>
                                                    <span>Ore Prenotabili: {bookableHours}h</span>
                                                    <button onClick={() => showBookingForm(pkg.id)}>Aggiungi Prenotazione</button>
                                                    <button onClick={() => setEditingPackage(pkg)}>Modifica</button>
                                                    <button onClick={() => handleDeletePackage(client.id, pkg.id)}>Elimina</button>
                                                </div>
                                            )}
                                            {showWarning && (<div className="warning-message">Attenzione: Le ore rimanenti o prenotabili sono meno di 5.</div>)}
                                            {bookingForm === pkg.id && (
                                                <form onSubmit={(e) => handleAddBooking(e, client.id, pkg.id)} className="booking-form">
                                                    <select value={bookingType} onChange={(e) => setBookingType(e.target.value)}>
                                                        <option value="single">Singola</option>
                                                        <option value="recurring">Ricorrente</option>
                                                    </select>
                                                    <input type="date" value={bookingDetails.date} onChange={(e) => setBookingDetails({ ...bookingDetails, date: e.target.value })} required />
                                                    <input type="time" value={bookingDetails.time} onChange={(e) => setBookingDetails({ ...bookingDetails, time: e.target.value })} required />
                                                    <input type="number" min="0.1" step="0.1" placeholder="Durata" value={bookingDetails.hours} onChange={(e) => setBookingDetails({ ...bookingDetails, hours: e.target.value })} required />
                                                    {bookingType === 'recurring' ? (
                                                      <div className="recurring-controls">
                                                        <input type="number" min="1" placeholder="N° settimane" value={bookingDetails.weeks} onChange={(e) => setBookingDetails({ ...bookingDetails, weeks: e.target.value })} required />
                                                        <div className="days-selector">
                                                          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (<label key={day}><input type="checkbox" checked={bookingDetails.days.includes(day)} onChange={() => handleDayChange(day)} />{day.toUpperCase()}</label>))}
                                                        </div>
                                                      </div>
                                                    ) : null }
                                                    <div className="form-actions">
                                                        <button type="submit">Conferma</button>
                                                        <button type="button" onClick={() => setBookingForm(null)}>Annulla</button>
                                                    </div>
                                                </form>
                                            )}
                                            <ul className="booking-list">
                                                {allOccurrences.map(occurrence => {
                                                    if (occurrence.isCancelled) return null;
                                                    const startTime = occurrence.effectiveDate;
                                                    const endTime = new Date(startTime);
                                                    endTime.setMinutes(startTime.getMinutes() + (occurrence.hoursBooked * 60));
                                                    const dateString = startTime.toISOString().split('T')[0];
                                                    const requestStatus = (occurrence.requests || {})[dateString]?.status;
                                                    let itemStyle = {};
                                                    if (requestStatus) {
                                                        if (requestStatus.includes('Urgente')) {
                                                            itemStyle = { backgroundColor: '#5c3333' };
                                                        } else {
                                                            itemStyle = { backgroundColor: '#4a412a' };
                                                        }
                                                    }
                                                    return (
                                                        <li key={occurrence.uniqueId} className="booking-item" style={itemStyle}>
                                                            <span>Data: {startTime.toLocaleDateString()}</span>
                                                            <span>Inizio: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span>Fine: {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span>Durata: {occurrence.hoursBooked}h</span>
                                                            <span>Stato: {requestStatus || (occurrence.isProcessed ? 'Svolta' : 'Da Svolgere')}</span>
                                                            <button className="delete-btn" onClick={() => handleDeleteOccurrence(client.id, pkg.id, occurrence)}>
                                                                Elimina
                                                            </button>
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