// @ts-nocheck
// La dashboard è stata unificata in /profilo.
// Questo redirect garantisce compatibilità con eventuali link salvati.
import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/profilo");
}
