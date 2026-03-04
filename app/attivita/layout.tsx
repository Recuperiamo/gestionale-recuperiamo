// @ts-nocheck
"use client";
import React from "react";
import AdminOnly from "../components/auth/AdminOnly";

export default function Layout({ children }) {
  return <AdminOnly>{children}</AdminOnly>;
}