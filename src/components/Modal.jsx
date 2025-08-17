import React from "react";

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle = {
  background: "#fff",
  borderRadius: "8px",
  padding: "2rem",
  minWidth: "320px",
  maxWidth: "90vw",
  boxShadow: "0 2px 24px rgba(0,0,0,0.2)",
  position: "relative",
};

const closeBtnStyle = {
  position: "absolute",
  top: "8px",
  right: "12px",
  fontSize: "1.5rem",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const Modal = ({ children, onClose }) => {
  // Chiude la modale se si clicca sull’overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Chiudi modale">
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;