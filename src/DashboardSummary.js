import React from 'react';

function DashboardSummary({ clients }) {
  const today = new Date();
  const startOfWeek = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 5); // Sabato
  endOfWeek.setHours(23, 59, 59, 999);

  const upcomingLessons = [];
  const lowHourPackages = [];

  clients.forEach(client => {
    (client.packages || []).forEach(pkg => {
      if (pkg.remainingHours < 5) {
        lowHourPackages.push({
          clientName: client.name,
          packageName: pkg.name,
          remainingHours: pkg.remainingHours
        });
      }

      (pkg.bookings || []).forEach(booking => {
        if (booking.type === 'single') {
          const lessonDate = new Date(booking.dateTime);
          if (lessonDate >= startOfWeek && lessonDate <= endOfWeek && !booking.isProcessed) {
            const endTime = new Date(lessonDate);
            endTime.setMinutes(lessonDate.getMinutes() + booking.hoursBooked * 60);
            upcomingLessons.push({
              clientName: client.name,
              date: lessonDate,
              endDate: endTime
            });
          }
        } else {
          const startDate = new Date(booking.startDate);
          const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
          for (let i = 0; i < booking.recurrence.weeks; i++) {
            (booking.recurrence.days || []).forEach(day => {
              const dayOfWeek = dayMap[day];
              const firstDayOfWeek = new Date(startDate);
              firstDayOfWeek.setDate(startDate.getDate() + (i * 7));
              const d = new Date(firstDayOfWeek);
              d.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay() + dayOfWeek);
              const dateString = d.toISOString().split('T')[0];
              const isCancelled = (booking.cancelledDates || []).includes(dateString);
              const hasRequest = (booking.requests || {})[dateString];

              if (!isCancelled && !hasRequest && d >= startOfWeek && d <= endOfWeek && !(booking.processedDates || []).includes(dateString)) {
                const endTime = new Date(d);
                endTime.setMinutes(d.getMinutes() + booking.hoursBooked * 60);
                upcomingLessons.push({
                  clientName: client.name,
                  date: d,
                  endDate: endTime
                });
              }
            });
          }
        }
      });
    });
  });

  upcomingLessons.sort((a, b) => a.date - b.date);

  return (
    <div className="dashboard-summary">
      <div className="summary-box">
        <h3>Lezioni della Settimana (Lun-Sab)</h3>
        {upcomingLessons.length > 0 ? (
          <ul>
            {upcomingLessons.map((lesson, index) => (
              <li key={index}>
                <strong>{lesson.clientName}</strong> - {lesson.date.toLocaleDateString([], {weekday: 'long', day: 'numeric'})} ({lesson.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {lesson.endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
              </li>
            ))}
          </ul>
        ) : (
          <p>Nessuna lezione in programma per questa settimana.</p>
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