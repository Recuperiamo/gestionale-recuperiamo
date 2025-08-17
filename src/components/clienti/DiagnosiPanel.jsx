/**
 * Mostra stato diagnosi/caricamento.
 */
import React from "react";

export default function DiagnosiPanel({ diagnosi }) {
  return (
    <div className="diagnosi">
      <span>{diagnosi || "Diagnosi in corso..."}</span>
    </div>
  );
}