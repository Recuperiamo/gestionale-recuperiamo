// src/DashboardSummary.js
import React from 'react';

function DashboardSummary({ clients }) {
  // Calcola l'inizio e la fine della settimana corrente (da oggi ai prossimi 7 giorni)
  const today = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(today.getDate() + 7);

  const upcomingLessons = [];
  const lowHourPackages = [];

  clients.forEach(client => {
    (client.packages || []).forEach(pkg => {
      // Trova i pacchetti con meno di 5 ore rimanenti
      if (pkg.remainingHours < 5) {
        lowHourPackages.push({
          clientName: client.name,
          packageName: pkg.name,
          remainingHours: pkg.remainingHours
        });
      }

      // Trova le lezioni della prossima settimana
      (pkg.bookings || []).forEach(booking => {
        if (booking.type === 'single') {
          const lessonDate = new Date(booking.dateTime);
          if (lessonDate >= today && lessonDate <= endOfWeek && !booking.isProcessed) {
            upcomingLessons.push({
              clientName: client.name,
              date: lessonDate,
              duration: booking.hoursBooked
            });
          }
        } else { // recurring
          const startDate = new Date(booking.startDate);
          for (let i = 0; i < booking.recurrence.weeks; i++) {
            (booking.recurrence.days || []).forEach(day => {
              const dayOfWeek = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 }[day];
              const d = new Date(startDate);
              d.setDate(d.getDate() + (i * 7) - d.getDay() + dayOfWeek);
              const dateString = d.toISOString().split('T')[0];

              if (d >= today && d <= endOfWeek && !(booking.processedDates || []).includes(dateString) && !(booking.cancelledDates || []).includes(dateString)) {
                upcomingLessons.push({
                  clientName: client.name,
                  date: d,
                  duration: booking.hoursBooked
                });
              }
            });
          }
        }
      });
    });
  });

  // Ordina le lezioni per data
  upcomingLessons.sort((a, b) => a.date - b.date);

  return (
    <div className="dashboard-summary">
      <div className="summary-box">
        <h3>Lezioni della Settimana</h3>
        {upcomingLessons.length > 0 ? (
          <ul>
            {upcomingLessons.map((lesson, index) => (
              <li key={index}>
                <strong>{lesson.clientName}</strong> - {lesson.date.toLocaleDateString()} @ {lesson.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({lesson.duration}h)
              </li>
            ))}
          </ul>
        ) : (
          <p>Nessuna lezione in programma per i prossimi 7 giorni.</p>
        )}
      </div>
      <div className="summary-box">
        <h3>Pacchetti in Esaurimento</h3>
        {lowHourPackages.length > 0 ? (
          <ul>
            {lowHourPackages.map((pkg, index) => (
              <li key={index}>
                <strong>{pkg.clientName}</strong> ({pkg.packageName}): {pkg.remainingHours}h rimaste
              </li>
            ))}
          </ul>
        ) : (
          <p>Nessun pacchetto con ore in esaurimento.</p>
        )}
      </div>
    </div>
  );
}

export default DashboardSummary;