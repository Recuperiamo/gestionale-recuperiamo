// Updated code for FullCalendar weekly view
import { FullCalendar } from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';

function CalendarComponent() {
  const events = [
    // Example event
    {
      title: 'Event Title', // Example title, to be hidden in the view
      start: '2023-10-01T10:00:00',
      end: '2023-10-01T11:00:00',
    },
    // Add more events as needed
  ];

  const eventDidMount = (info) => {
    // Custom tooltip functionality
    info.el.setAttribute('data-tooltip', info.event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + info.event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    // You can customize further if needed
  };

  return (
    <FullCalendar
      plugins={[timeGridPlugin]}
      initialView="timeGridWeek"
      events={events}
      eventDidMount={eventDidMount}
      eventRender={info => {
        // Hide the title
        info.el.querySelector('.fc-title').style.display = 'none';
      }}
    />
  );
}

export default CalendarComponent;