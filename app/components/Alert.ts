// @ts-nocheck
import React from 'react';

export default function Alert({ message, type = "error", onClose, topPage = false, large = false }) {
  if (!message) return null;

  // Palette brand: success (verde), error (rosso)
  const colorMap = {
    success: "bg-green-100 border-green-400 text-green-800",
    error: "bg-red-100 border-red-400 text-red-800"
  };

  const iconMap = {
    success: (
      <svg className="w-4 h-4 mr-2 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path stroke="currentColor" strokeWidth="2" d="M9 12l2 2l4 -4" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 mr-2 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path stroke="currentColor" strokeWidth="2" d="M15 9l-6 6M9 9l6 6" />
      </svg>
    )
  };

  const baseColor = colorMap[type] || colorMap.error;
  const icon = iconMap[type] || iconMap.error;

  // Inline style for alert fixed at top of page and large
  const topStyle = topPage
    ? {
        position: 'fixed',
        top: '36px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        minWidth: "340px",
        maxWidth: "700px",
        width: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        padding: "24px 40px",
        fontSize: large ? "2.2rem" : "1.2rem",
        borderRadius: "18px",
        textAlign: "center",
        lineHeight: "1.4",
        display: "flex",
        alignItems: "center",
      }
    : {
        fontSize: "14px",
        boxSizing: "border-box",
        minWidth: "160px",
        maxWidth: "260px",
        wordBreak: "break-word",
      };

  return (
    <div
      className={`${
        topPage
          ? "alert-top"
          : "fixed bottom-5 right-5 z-30"
      } ${baseColor} border-l-4 px-3 py-2 rounded-lg shadow-lg flex items-center animate-alert-slide`}
      style={topStyle}
      role="alert"
    >
      {icon}
      <span className="flex-1 font-medium break-words">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 flex items-center justify-center bg-white bg-opacity-30 hover:bg-opacity-60 rounded-full"
        style={{
          width: topPage ? "2.6rem" : "1.25rem",
          height: topPage ? "2.6rem" : "1.25rem",
        }}
        aria-label="Chiudi"
        title="Chiudi"
        tabIndex={0}
      >
        <svg
          className={topPage ? "w-6 h-6 text-gray-600" : "w-3 h-3 text-gray-600"}
          viewBox="0 0 20 20"
          stroke="currentColor"
          fill="none"
        >
          <path d="M6 6l8 8M6 14L14 6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <style>{`
        .animate-alert-slide {
          animation: alert-slide-in 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes alert-slide-in {
          from { transform: translateY(20px) scale(0.97); opacity: 0;}
          to { transform: translateY(0) scale(1); opacity: 1;}
        }
        .alert-top {
          /* no-op for Tailwind reset, fully overridden inline */
        }
      `}</style>
    </div>
  );
}
