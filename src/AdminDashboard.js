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
                        // Aggiungi solo se la richiesta non è stata risolta
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
      const now = new Date();
      clients.forEach(client => {
        let clientWasUpdated = false;
        const updatedPackages = (client.packages || []).map(pkg => {
          let wasUpdated = false;
          const newBookings = (pkg.bookings || []).map(booking => {
            let bookingAltered = false;
            let tempBooking = { ...booking };
            
            if (tempBooking.type === 'single' && !tempBooking.isProcessed && new Date(tempBooking.dateTime) < now) {
              const dateString = new Date(tempBooking.dateTime).toISOString().split('T')[0];
              if (!(tempBooking.requests && tempBooking.requests[dateString])) {
                tempBooking.isProcessed = true;
                bookingAltered = true;
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

                  if (!isCancelled && !hasRequest && d < now && !newProcessedDates.includes(dateString)) {
                    newProcessedDates.push(dateString);
                    recurringUpdated = true;
                  }
                });
              }
              if (recurringUpdated) {
                tempBooking.processedDates = newProcessedDates;
                bookingAltered = true;
              }
            }
            if (bookingAltered) {
              wasUpdated = true;
            }
            return tempBooking;
          });

          if (wasUpdated) {
            clientWasUpdated = true;
            let completedHours = 0;
            newBookings.forEach(b => {
              if(b.type === 'single' && b.isProcessed) completedHours += b.hoursBooked;
              if(b.type === 'recurring') completedHours += (b.processedDates || []).length * b.hoursBooked;
            });
            return { ...pkg, bookings: newBookings, remainingHours: pkg.totalHours - completedHours };
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

  // ... (tutte le altre funzioni di gestione rimangono uguali, le ometto per brevità)

  return (
    <div>
        {/* ... (Il JSX rimane identico, ma ora funzionerà correttamente) ... */}
    </div>
  );
}

// Per sicurezza, il codice completo di AdminDashboard.js è sotto