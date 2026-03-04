// @ts-nocheck
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to aula main page — Programma is now embedded in the Aula UI
export default function ProgrammaPage({ params }) {
  const router = useRouter();
  useEffect(() => {
    const clienteId = Array.isArray(params?.clienteId) ? params?.clienteId[0] : params?.clienteId;
    if (clienteId) router.replace(`/aula/${clienteId}`);
    else router.replace('/aule');
  }, [params, router]);
  return null;
}


