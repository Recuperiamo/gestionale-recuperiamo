import React from 'react';

export default function Alert({ message, type = "error", onClose }) {
  if (!message) return null;

  const colorMap = {
    success: "bg-green-600 border-green-700 text-white",
    error: "bg-red-600 border-red-800 text-white"
  };

  const baseColor = colorMap[type] || colorMap.error;

  const icon =
    type === "success" ? (
      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path stroke="currentColor" strokeWidth="2" d="M9 12l2 2l4 -4" />
      </svg>
    ) : (
      <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path stroke="currentColor" strokeWidth="2" d="M15 9l-6 6M9 9l6 6" />
      </svg>
    );

  return (
    <div
      className={`fixed bottom-5 right-5 z-30 ${baseColor} border-l-4 px-3 py-2 rounded-lg shadow-lg flex items-center w-[260px] animate-alert-slide`}
      style={{
        fontSize: "14px",
        boxSizing: "border-box",
        minWidth: "160px",
        maxWidth: "260px",
        wordBreak: "break-word",
      }}
      role="alert"
    >
      {icon}
      <span className="flex-1 font-medium break-words">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 flex items-center justify-center bg-white bg-opacity-30 hover:bg-opacity-50 rounded-full w-5 h-5 transition duration-150"
        aria-label="Chiudi"
        title="Chiudi"
        tabIndex={0}
      >
        <svg className="w-3 h-3" viewBox="0 0 20 20" stroke="currentColor" fill="none">
          <path d="M6 6l8 8M6 14L14 6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <style jsx>{`
        .animate-alert-slide {
          animation: alert-slide-in 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes alert-slide-in {
          from { transform: translateY(20px) scale(0.97); opacity: 0;}
          to { transform: translateY(0) scale(1); opacity: 1;}
        }
      `}</style>
    </div>
  );
}