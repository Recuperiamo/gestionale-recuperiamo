import React from 'react';

export default function Alert({ message, type = "error", onClose }) {
  if (!message) return null;
  const color = type === "success"
    ? "bg-green-100 border-green-400 text-green-700"
    : "bg-red-100 border-red-400 text-red-700";
  return (
    <div className={`fixed top-4 right-4 z-50 ${color} px-4 py-3 rounded shadow-lg flex items-center space-x-2`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-4 px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-800"
        aria-label="Chiudi"
      >
        ✕
      </button>
    </div>
  );
}