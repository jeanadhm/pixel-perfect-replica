"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo/store";
import { api } from "@/lib/api/client";
import { PageHeader, Panel } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function SettingsPage() {
  const { user, members, snapshot, refresh, logout } = useDemo();
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipe & paramètres"
        description="Membres de l’équipe, rôles et données partagées."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Votre session">
          <p className="font-semibold">{user?.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.email} · {user?.role}
          </p>
          <Button variant="outline" className="mt-5" onClick={() => void logout()}>
            Se déconnecter
          </Button>
        </Panel>
        <Panel title="Conservation des données">
          <p className="text-sm leading-6 text-muted-foreground">
            Les données sont enregistrées dans la base partagée. Le navigateur conserve uniquement
            le site sélectionné. Une déconnexion ou un autre ordinateur ne supprime pas le travail
            de l’équipe.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      format: "ambs-real-v1",
                      exportedAt: new Date().toISOString(),
                      state: snapshot(),
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "ambs-suivi-reel.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }}
          >
            Exporter les données de suivi
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Cet export ne contient ni mots de passe ni jetons Google. La sauvegarde complète du
            serveur se réalise avec pg_dump.
          </p>
        </Panel>
      </div>
      <Panel
        title="Membres de l’équipe"
        description="Les noms de cette liste sont disponibles comme responsables."
      >
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div>
                <b>{member.name}</b>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <span>
                {member.role === "admin"
                  ? "Administrateur"
                  : member.role === "editor"
                    ? "Éditeur"
                    : "Lecture seule"}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      {user?.role === "admin" && (
        <Panel
          title="Ajouter un membre"
          description="Créez uniquement un compte pour une personne réelle. Communiquez le mot de passe par votre canal habituel sécurisé."
        >
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setBusy(true);
              try {
                await api("/users", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                form.reset();
                await refresh();
                toast.success("Membre créé");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Création impossible");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="text-sm">
              Nom complet
              <Input name="name" required minLength={2} className="mt-1" />
            </label>
            <label className="text-sm">
              Adresse professionnelle
              <Input name="email" type="email" required className="mt-1" />
            </label>
            <label className="text-sm">
              Mot de passe initial
              <Input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                className="mt-1"
              />
            </label>
            <label className="text-sm">
              Rôle
              <select name="role" className="mt-1 h-10 w-full rounded-md border bg-card px-3">
                <option value="editor">Éditeur</option>
                <option value="viewer">Lecture seule</option>
                <option value="admin">Administrateur</option>
              </select>
            </label>
            <Button disabled={busy}>{busy ? "Création…" : "Créer le membre"}</Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
