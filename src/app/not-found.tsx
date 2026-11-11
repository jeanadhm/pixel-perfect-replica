import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-4 text-center">
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <Link href="/">Retour au tableau de bord</Link>
    </main>
  );
}
