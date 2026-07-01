// @ts-nocheck
"use client";
import React from "react";

interface PageHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Intestazione pagina stile A: fascia blu degradante con icona, titolo,
 * sottotitolo opzionale e slot per pulsante azione.
 * Usare insieme a <PageCard> per la card completa, oppure standalone.
 */
export function PageHeader({ icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #20489a 0%, #1c3d87 100%)",
      borderRadius: "16px 16px 0 0",
      padding: "clamp(16px,2.5vw,28px) clamp(20px,3vw,36px)",
      display: "flex",
      alignItems: "center",
      gap: "clamp(12px,1.5vw,20px)",
      flexWrap: "wrap",
    }}>
      {icon && (
        <div style={{
          width: "clamp(40px,4vw,52px)", height: "clamp(40px,4vw,52px)",
          background: "rgba(255,255,255,0.15)",
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "clamp(20px,2vw,26px)",
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          margin: 0,
          color: "#fff",
          fontSize: "clamp(18px,2vw,28px)",
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: "-0.3px",
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: "clamp(3px,0.4vw,6px) 0 0",
            color: "rgba(255,255,255,0.72)",
            fontSize: "clamp(12px,1vw,14px)",
            fontWeight: 500,
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div style={{ flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * Card completa = PageHeader (blu) + slot contenuto (bianco).
 * Avvolge header e corpo in un unico blocco con bordo e ombra.
 *
 * Uso:
 *   <PageCard icon="📦" title="Gestione Pacchetti" subtitle="124 totali"
 *             action={<button>+ Nuovo</button>}>
 *     <div style={{ padding: "20px 24px" }}>... filtri e lista ...</div>
 *   </PageCard>
 */
export function PageCard({
  icon, title, subtitle, action, children,
}: PageHeaderProps & { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 2px 16px rgba(32,72,154,0.08)",
    }}>
      <PageHeader icon={icon} title={title} subtitle={subtitle} action={action} />
      <div style={{
        background: "#fff",
        border: "1.5px solid #dbe4f1",
        borderTop: "none",
        borderRadius: "0 0 16px 16px",
      }}>
        {children}
      </div>
    </div>
  );
}

/** Pulsante azione standard da usare nello slot action di PageHeader/PageCard */
export function PageAction({
  children, onClick, variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "light";
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      style={{
        background: isPrimary ? "#1cb0f6" : "rgba(255,255,255,0.15)",
        color: "#fff",
        border: isPrimary ? "none" : "1.5px solid rgba(255,255,255,0.4)",
        borderRadius: 10,
        padding: "clamp(9px,1vw,12px) clamp(18px,2vw,26px)",
        fontWeight: 700,
        fontSize: "clamp(13px,1.1vw,15px)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "opacity 0.15s",
      }}
      onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
      onMouseOut={e => e.currentTarget.style.opacity = "1"}
    >
      {children}
    </button>
  );
}
