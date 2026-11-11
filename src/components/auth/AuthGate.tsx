"use client";
import { useState, type ReactNode } from "react";
import { useDemo } from "@/lib/demo/store";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, setupRequired, production, refresh, error } = useDemo();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (loading)
    return (
      <main className="grid min-h-screen place-content-center">
        <p>Connexion à l’espace AMBS…</p>
      </main>
    );
  if (user) return children;
  return (
    <main className="grid min-h-screen place-items-center bg-[#123e35] p-5">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          AMBS Visibility Hub
        </p>
        <h1 className="mt-4 text-2xl font-bold">
          {setupRequired ? "Créer le compte de l’équipe" : "Connexion à votre espace"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Un espace partagé pour vos sites et les actions de votre équipe.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const data = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await api(setupRequired ? "/auth/setup" : "/auth/login", {
                method: "POST",
                body: JSON.stringify(data),
              });
              await refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Connexion impossible");
            } finally {
              setBusy(false);
            }
          }}
        >
          {setupRequired && (
            <label className="block text-sm">
              Votre nom
              <Input name="name" required autoComplete="name" className="mt-1" />
            </label>
          )}
          <label className="block text-sm">
            Adresse professionnelle
            <Input name="email" type="email" required autoComplete="username" className="mt-1" />
          </label>
          <label className="block text-sm">
            Mot de passe
            <Input
              name="password"
              type="password"
              minLength={12}
              maxLength={200}
              required
              autoComplete={setupRequired ? "new-password" : "current-password"}
              className="mt-1"
            />
            <span className="text-xs text-muted-foreground">12 caractères minimum</span>
          </label>
          {setupRequired && production && (
            <label className="block text-sm">
              Jeton de configuration
              <Input name="setupToken" type="password" required className="mt-1" />
            </label>
          )}
          {(message || error) && (
            <p role="alert" className="text-sm text-destructive">
              {message || error}
            </p>
          )}
          <Button disabled={busy} className="w-full">
            {busy
              ? "Connexion…"
              : setupRequired
                ? "Créer le compte administrateur"
                : "Se connecter"}
          </Button>
        </form>
        {error && (
          <Button variant="ghost" className="mt-3 w-full" onClick={() => void refresh()}>
            Réessayer la connexion au serveur
          </Button>
        )}
      </section>
    </main>
  );
}
