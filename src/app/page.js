import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded shadow-md p-8 mt-10 w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="mb-2">Login avvenuto con successo!</p>
        <div className="mb-4">
          <strong>Email:</strong> {session.user.email}
        </div>
        <div>
          <strong>Ruolo:</strong> {session.user.role ?? "N/D"}
        </div>
      </div>
    </main>
  );
}