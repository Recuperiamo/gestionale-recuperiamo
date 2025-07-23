// src/RequestManager.js
import React from 'react';

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

export default RequestManager;