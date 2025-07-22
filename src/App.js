import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [clients, setClients] = useState(() => {
    const savedClients = localStorage.getItem('gestionaleClientiData');
    return savedClients ? JSON.parse(savedClients) : [];
  });

  const [clientName, setClientName] = useState('');
  const [bookingForm, setBookingForm] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageFormClientId, setPackageFormClientId] = useState(null);
  const [newPackageDetails, setNewPackageDetails] = useState({ name: '', totalHours: '' });
  const [bookingType, setBookingType] = useState('single');
  const [bookingDetails, setBookingDetails] = useState({ date: '', time: '', hours: 1, weeks: 4, days: [] });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState([]);

  useEffect(() => {
    localStorage.setItem('gestionaleClientiData', JSON.stringify(clients));
  }, [clients]);

  const handleAddClient = (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    const newClient = { id: Date.now(), name: clientName, packages: [] };
    setClients([...clients, newClient]);
    setClientName('');
  };

  const showPackageForm = (clientId) => {
    setPackageFormClientId(clientId);
  };
  
  const handleAddPackage = (e, clientId) => {
    e.preventDefault();
    const newPackage = {
      id: Date.now(),
      name: newPackageDetails.name,
      totalHours: parseFloat(newPackageDetails.totalHours),
      remainingHours: parseFloat(newPackageDetails.totalHours),
      bookings: []
    };
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        return { ...client, packages: [...client.packages, newPackage] };
      }
      return client;
    });
    setClients(updatedClients);
    setPackageFormClientId(null);
    setNewPackageDetails({ name: '', totalHours: '' });
  };
  
  const showBookingForm = (packageId) => {
    setBookingForm(packageId);
    setBookingDetails({ date: '', time: '', hours: 1, weeks: 4, days: [] });
    setBookingType('single');
  };

  const handleDayChange = (day) => {
    const currentDays = bookingDetails.days;
    if (currentDays.includes(day)) {
      setBookingDetails({...bookingDetails, days: currentDays.filter(d => d !== day)});
    } else {
      setBookingDetails({...bookingDetails, days: [...currentDays, day]});
    }
  };

  const handleAddBooking = (e, clientId, packageId) => {
    e.preventDefault();
    let newBooking;
    const hours = parseFloat(bookingDetails.hours);
    const startDate = `${bookingDetails.date}T${bookingDetails.time}`;

    if (bookingType === 'single') {
      newBooking = {
        id: Date.now(),
        type: 'single',
        dateTime: startDate,
        hoursBooked: hours,
        isProcessed: false
      };
    } else {
      if (bookingDetails.days.length === 0) {
        alert('Per una prenotazione ricorrente, seleziona almeno un giorno della settimana.');
        return;
      }
      newBooking = {
        id: Date.now(),
        type: 'recurring',
        startDate: startDate,
        hoursBooked: hours,
        recurrence: {
          weeks: parseInt(bookingDetails.weeks, 10),
          days: bookingDetails.days
        },
        processedDates: [],
        cancelledDates: []
      };
    }

    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        const updatedPackages = client.packages.map(pkg => {
          if (pkg.id === packageId) {
            const totalHoursToBook = bookingType === 'recurring' ? hours * newBooking.recurrence.weeks * newBooking.recurrence.days.length : hours;
            if (pkg.remainingHours < totalHoursToBook) {
              alert('Errore: Ore insufficienti nel pacchetto per coprire tutte le prenotazioni.');
              return pkg;
            }
            return { ...pkg, bookings: [...(pkg.bookings || []), newBooking] };
          }
          return pkg;
        });
        return { ...client, packages: updatedPackages };
      }
      return client;
    });
    setClients(updatedClients);
    setBookingForm(null);
  };
  
  const handleDeleteClient = (clientId) => {
    if (window.confirm('Sei sicuro di voler eliminare questo cliente e tutti i suoi dati?')) {
      const updatedClients = clients.filter(client => client.id !== clientId);
      setClients(updatedClients);
    }
  };

  const handleDeletePackage = (clientId, packageId) => {
    if (window.confirm('Sei sicuro di voler eliminare questo pacchetto?')) {
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          const updatedPackages = client.packages.filter(pkg => pkg.id !== packageId);
          return { ...client, packages: updatedPackages };
        }
        return client;
      });
      setClients(updatedClients);
    }
  };

  const handleUpdatePackage = (e, clientId, packageId) => {
    e.preventDefault();
    const updatedClients = clients.map(client => {
      if (client.id === clientId) {
        const updatedPackages = client.packages.map(pkg => {
          if (pkg.id === packageId) {
            const hourDifference = parseFloat(editingPackage.totalHours) - pkg.totalHours;
            const newRemainingHours = pkg.remainingHours + hourDifference;
            return { ...pkg, ...editingPackage, remainingHours: newRemainingHours };
          }
          return pkg;
        });
        return { ...client, packages: updatedPackages };
      }
      return client;
    });
    setClients(updatedClients);
    setEditingPackage(null);
  };
  
  const handleSelectBooking = (bookingId) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId));
    } else {
      setSelectedBookings([...selectedBookings, bookingId]);
    }
  };
  
  const handleSelectAll = (occurrenceIds) => {
    const allSelected = occurrenceIds.every(id => selectedBookings.includes(id));
    if (allSelected) {
      setSelectedBookings(selectedBookings.filter(id => !occurrenceIds.includes(id)));
    } else {
      const newSelection = [...new Set([...selectedBookings, ...occurrenceIds])];
      setSelectedBookings(newSelection);
    }
  };

  const handleDeleteSelectedBookings = () => {
    if (selectedBookings.length === 0) {
      alert('Nessuna prenotazione selezionata.');
      return;
    }
    if (window.confirm(`Sei sicuro di voler eliminare ${selectedBookings.length} lezioni?`)) {
        const updatedClients = JSON.parse(JSON.stringify(clients));

        updatedClients.forEach(client => {
            (client.packages || []).forEach(pkg => {

                const allOccurrencesInPkg = [];
                (pkg.bookings || []).forEach(b => {
                    if (b.type === 'single') {
                        allOccurrencesInPkg.push({ ...b, uniqueId: b.id, isProcessed: b.isProcessed });
                    } else {
                        const startDate = new Date(b.startDate);
                        for (let i = 0; i < b.recurrence.weeks; i++) {
                            (b.recurrence.days || []).forEach(day => {
                               const dayOfWeek = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 }[day];
                               const d = new Date(startDate);
                               d.setDate(d.getDate() + (i * 7) - d.getDay() + dayOfWeek);
                               const uniqueId = `${b.id}-${d.toISOString()}`;
                               const isCancelled = (b.cancelledDates || []).includes(d.toISOString().split('T')[0]);
                               if (!isCancelled) {
                                   allOccurrencesInPkg.push({ ...b, uniqueId, isProcessed: (b.processedDates || []).includes(d.toISOString().split('T')[0]) });
                               }
                            });
                        }
                    }
                });

                // --- LOGICA DI RIPRISTINO CORRETTA ---
                let hoursToRestore = 0;
                selectedBookings.forEach(selectedId => {
                    const occ = allOccurrencesInPkg.find(o => o.uniqueId.toString() === selectedId.toString());
                    // Ripristina le ore SOLO SE la lezione era stata processata (svolta)
                    if (occ && occ.isProcessed) {
                        hoursToRestore += occ.hoursBooked;
                    }
                });

                if (hoursToRestore > 0) {
                    pkg.remainingHours += hoursToRestore;
                }

                pkg.bookings = pkg.bookings
                    .map(booking => {
                        if (booking.type === 'recurring') {
                            const cancelledDatesForThisBooking = selectedBookings
                                .filter(selId => selId.toString().startsWith(booking.id.toString()))
                                .map(selId => new Date(selId.split(`${booking.id}-`)[1]).toISOString().split('T')[0]);
                            
                            if (cancelledDatesForThisBooking.length > 0) {
                                booking.cancelledDates = [...new Set([...(booking.cancelledDates || []), ...cancelledDatesForThisBooking])];
                            }
                        }
                        return booking;
                    })
                    .filter(booking => {
                        if (booking.type === 'single') {
                            return !selectedBookings.includes(booking.id);
                        }
                        return true;
                    });
            });
        });

        setClients(updatedClients);
        setSelectedBookings([]);
        setDeleteMode(false);
    }
  };

  useEffect(() => {
    const processBookings = () => {
      const now = new Date();
      let changed = false;
      let tempClients = JSON.parse(JSON.stringify(clients));
      const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };

      tempClients.forEach(client => {
        (client.packages || []).forEach(pkg => {
          (pkg.bookings || []).forEach(booking => {
            if (booking.type === 'single' && !booking.isProcessed && new Date(booking.dateTime) < now) {
              changed = true;
              pkg.remainingHours -= booking.hoursBooked;
              booking.isProcessed = true;
            } else if (booking.type === 'recurring') {
              const startDate = new Date(booking.startDate);
              for (let i = 0; i < booking.recurrence.weeks; i++) {
                (booking.recurrence.days || []).forEach(day => {
                  const dayOfWeek = dayMap[day];
                  const firstDayOfRecurrenceWeek = new Date(startDate);
                  firstDayOfRecurrenceWeek.setDate(startDate.getDate() + (i * 7));
                  const date = new Date(firstDayOfRecurrenceWeek);
                  date.setDate(firstDayOfRecurrenceWeek.getDate() - firstDayOfRecurrenceWeek.getDay() + dayOfWeek);
                  const dateString = date.toISOString().split('T')[0];
                  const isCancelled = (booking.cancelledDates || []).includes(dateString);

                  if (!isCancelled && date < now && !(booking.processedDates || []).includes(dateString)) {
                    changed = true;
                    pkg.remainingHours -= booking.hoursBooked;
                    (booking.processedDates = booking.processedDates || []).push(dateString);
                  }
                });
              }
            }
          });
        });
      });
      
      if (changed) {
        setClients(tempClients);
      }
    };
    const intervalId = setInterval(processBookings, 30000);
    return () => clearInterval(intervalId);
  }, [clients]);

  return (
    <div className="App">
      <style>{`
        body { background-color: #282c34; color: white; font-family: sans-serif; }
        .App { max-width: 900px; margin: 20px auto; padding: 20px; }
        h1, h2 { color: #61dafb; border-bottom: 2px solid #61dafb; padding-bottom: 10px; }
        button { background-color: #61dafb; border: none; padding: 8px 12px; margin: 0 5px; border-radius: 4px; cursor: pointer; color: #282c34; font-weight: bold; transition: opacity 0.2s; }
        button:hover { opacity: 0.8; }
        input, select { padding: 8px; margin: 5px; border-radius: 4px; border: 1px solid #61dafb; background-color: #333; color: white; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 10px; }
        .add-client-form { margin-bottom: 30px; }
        .client-list > ul > li { border: 1px solid #4a4a4a; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .client-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .client-header span { font-size: 1.5em; font-weight: bold; }
        .package-item { border: 1px solid #444; padding: 15px; border-radius: 6px; margin-top: 10px; }
        .package-details, .booking-item, .add-package-form, .edit-package-form, .booking-form { display: flex; flex-wrap: wrap; align-items: center; gap: 15px; padding: 10px 0; }
        .booking-item { border-bottom: 1px solid #444; }
        .booking-item:last-child { border-bottom: none; }
        .booking-item.selected { background-color: #004058; border-radius: 4px; }
        .warning-message { background-color: #8d4b00; padding: 8px; border-radius: 4px; width: 100%; text-align: center; margin-top: 10px; }
        .delete-mode-controls { padding: 10px; background-color: #4a0000; border-radius: 4px; margin-top: 10px; display: flex; gap: 10px; }
        .days-selector { display: flex; gap: 10px; padding: 5px; align-items: center; }
        .days-selector label { display: flex; align-items: center; gap: 4px; }
      `}</style>

      <header className="App-header">
        <h1>Gestionale Pacchetti Ore</h1>
      </header>
      
      <main>
        <form className="add-client-form" onSubmit={handleAddClient}>
          <input 
            type="text"
            placeholder="Nome nuovo cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <button type="submit">Aggiungi Cliente</button>
        </form>

        <div className="client-list">
          <h2>Clienti</h2>
          <ul>
            {clients.map(client => (
              <li key={client.id}>
                <div className="client-header">
                  <span>{client.name}</span>
                  <div>
                    <button onClick={() => showPackageForm(client.id)}>Aggiungi Pacchetto</button>
                    <button onClick={() => handleDeleteClient(client.id)}>Elimina Cliente</button>
                  </div>
                </div>

                {packageFormClientId === client.id && (
                  <form onSubmit={(e) => handleAddPackage(e, client.id)} className="add-package-form">
                    <input type="text" placeholder="Nome pacchetto" value={newPackageDetails.name} onChange={(e) => setNewPackageDetails({...newPackageDetails, name: e.target.value})} required />
                    <input type="number" min="1" placeholder="Ore totali" value={newPackageDetails.totalHours} onChange={(e) => setNewPackageDetails({...newPackageDetails, totalHours: e.target.value})} required />
                    <button type="submit">Crea</button>
                    <button type="button" onClick={() => setPackageFormClientId(null)}>Annulla</button>
                  </form>
                )}

                <ul className="package-list">
                  {(client.packages || []).map(pkg => {
                    const allOccurrences = [];
                    const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
                    (pkg.bookings || []).forEach(booking => {
                      if (booking.type === 'single') {
                        allOccurrences.push({ ...booking, uniqueId: booking.id, effectiveDate: new Date(booking.dateTime) });
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
                            allOccurrences.push({
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
                    
                    const totalCompletedHours = visibleOccurrences
                      .filter(occ => occ.isProcessed)
                      .reduce((sum, occ) => sum + occ.hoursBooked, 0);

                    const totalBookedHours = visibleOccurrences
                      .reduce((sum, occ) => sum + occ.hoursBooked, 0);
                    
                    const bookableHours = pkg.totalHours - totalBookedHours;
                    const showWarning = pkg.remainingHours < 5 || bookableHours < 5;

                    return (
                      <li key={pkg.id} className="package-item">
                        {editingPackage && editingPackage.id === pkg.id ? (
                          <form onSubmit={(e) => handleUpdatePackage(e, client.id, pkg.id)} className="edit-package-form">
                            <input type="text" value={editingPackage.name} onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})} />
                            <input type="number" value={editingPackage.totalHours} onChange={(e) => setEditingPackage({...editingPackage, totalHours: e.target.value})} />
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
                        
                        {showWarning && (
                          <div className="warning-message">
                            Attenzione: Le ore rimanenti o prenotabili sono meno di 5.
                          </div>
                        )}
                        
                        {bookingForm === pkg.id && (
                          <form onSubmit={(e) => handleAddBooking(e, client.id, pkg.id)} className="booking-form">
                            <select value={bookingType} onChange={(e) => setBookingType(e.target.value)}>
                              <option value="single">Singola</option>
                              <option value="recurring">Ricorrente</option>
                            </select>
                            <input type="date" value={bookingDetails.date} onChange={(e) => setBookingDetails({...bookingDetails, date: e.target.value})} required />
                            <input type="time" value={bookingDetails.time} onChange={(e) => setBookingDetails({...bookingDetails, time: e.target.value})} required />
                            <input type="number" min="0.1" step="0.1" placeholder="Durata" value={bookingDetails.hours} onChange={(e) => setBookingDetails({...bookingDetails, hours: e.target.value})} required />
                            {bookingType === 'recurring' && (
                              <>
                                <input type="number" min="1" placeholder="N° settimane" value={bookingDetails.weeks} onChange={(e) => setBookingDetails({...bookingDetails, weeks: e.target.value})} required />
                                <div className="days-selector">
                                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                                    <label key={day}>
                                      <input type="checkbox" checked={bookingDetails.days.includes(day)} onChange={() => handleDayChange(day)} />
                                      {day.toUpperCase()}
                                    </label>
                                  ))}
                                </div>
                              </>
                            )}
                            <button type="submit">Conferma</button>
                            <button type="button" onClick={() => setBookingForm(null)}>Annulla</button>
                          </form>
                        )}
                        
                        <div className="delete-mode-controls">
                          <button onClick={() => setDeleteMode(!deleteMode)}>
                            {deleteMode ? 'Annulla Cancellazione' : 'Cancellazione Multipla'}
                          </button>
                          {deleteMode && (
                            <>
                              <button onClick={() => handleSelectAll(allOccurrences.map(o => o.uniqueId))}>
                                Seleziona/Deseleziona Tutto
                              </button>
                              <button onClick={handleDeleteSelectedBookings}>
                                Elimina Selezionate ({selectedBookings.length})
                              </button>
                            </>
                          )}
                        </div>

                        <ul className="booking-list">
                          {allOccurrences.map(occurrence => {
                            if (occurrence.isCancelled) {
                              return null;
                            }
                            
                            const startTime = occurrence.effectiveDate;
                            const endTime = new Date(startTime);
                            endTime.setMinutes(startTime.getMinutes() + (occurrence.hoursBooked * 60));

                            return (
                              <li key={occurrence.uniqueId} className={`booking-item ${selectedBookings.includes(occurrence.uniqueId) ? 'selected' : ''}`}>
                                {deleteMode && (
                                  <input 
                                    type="checkbox"
                                    checked={selectedBookings.includes(occurrence.uniqueId)}
                                    onChange={() => handleSelectBooking(occurrence.uniqueId)}
                                  />
                                )}
                                <span>Data: {startTime.toLocaleDateString()}</span>
                                <span>Inizio: {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span>Fine: {endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span>Durata: {occurrence.hoursBooked}h</span>
                                <span>Stato: {occurrence.isProcessed ? 'Svolta' : 'Da Svolgere'}</span>
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

export default App;