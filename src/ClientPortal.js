// src/ClientPortal.js
import React, { useState, useEffect } from 'react';
import { db } from './firebase-config';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";

function ClientPortal({ user }) {
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestForm, setRequestForm] = useState(null);
  const [requestDetails, setRequestDetails] = useState({ type: 'sposta', newDate: '', newTimeFrom: '', newTimeTo: '', availability: {} });
  
  const auth = getAuth();

  useEffect(() => {
    if (!user || !user.email) return;
    const clientsQuery = query(collection(db, "clients"), where("email", "==", user.email));
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setClientData({ ...snapshot.docs[0].data(), id: snapshot.docs[0].id });
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
      const message = "Oh-oh, sembra che tu sia arrivato/a in ritardo. Lo spostamento della lezione è garantito solo fino a 4 giorni prima. Farò il possibile per soddisfare la tua richiesta ma, nel caso non mi fosse possibile, la lezione sarà considerata svolta come da regola concordata.\n\nSe vuoi comunque proseguire, premi 'OK'.";
      if (window.confirm(message)) {
        submitUrgentRequest(occurrence);
      }
    } else {
      setRequestForm(occurrence);
      setRequestDetails({ type: 'sposta', newDate: '', newTimeFrom: '', newTimeTo: '', availability: {} });
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
        delete currentAvailability[dateString];
      } else {
        currentAvailability[dateString] = { from: '', to: '' };
      }
    } else {
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
            if (!requestDetails.newDate || !requestDetails.newTimeFrom || !requestDetails.newTimeTo) {
                alert('Per favore, inserisci nuova data e fascia oraria.');
                return;
            }
            newStatus = `Spostamento Richiesto a: ${new Date(requestDetails.newDate).toLocaleDateString()} (dalle ${requestDetails.newTimeFrom} alle ${requestDetails.newTimeTo})`;
            changeDetails.newDate = requestDetails.newDate;
            changeDetails.newTimeFrom = requestDetails.newTimeFrom;
            changeDetails.newTimeTo = requestDetails.newTimeTo;
        }
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
  if (!clientData) return (<div>...</div>);
  
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

  return (
    <div className="App">
        {/* ... (Il JSX rimane quasi identico, ma con la nuova logica per il form) ... */}
    </div>
  );
}

export default ClientPortal;