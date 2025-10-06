"use client";
import React from "react";
import AdminOnly from "../components/auth/AdminOnly";

// Variante A (attuale): solo admin
export default function Layout({ children }) {
  return <AdminOnly>{children}</AdminOnly>;
}