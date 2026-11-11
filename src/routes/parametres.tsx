import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { pageHead } from "@/lib/head";
import { useDemo } from "@/lib/demo/store";
import { stateSchema, type DemoState } from "@/lib/demo/schema";
import { PageHeader, Panel, Field } from "@/components/shared/ui";
import { FormField, NativeSelect } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
export const Route = createFileRoute("/parametres")({
  head: pageHead("Paramètres", "Espaces de travail, sauvegardes et sources de données."),
  component: SettingsPage,
});
function SettingsPage() {
  const { workspace, switchWorkspace, reset, storageAvailable, snapshot, restore } = useDemo();
  const [pending, setPending] = useState<DemoState | null>(null);
  const backup = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              format: "ambs-workspace-v1",
              workspace,
              exportedAt: new Date().toISOString(),
              data: snapshot(),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ambs-${workspace}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Sauvegarde complète exportée");
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Choisissez votre espace et conservez une sauvegarde de votre travail."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Espace actif">
          <FormField label="Espace de travail">
            {(id) => (
              <NativeSelect
                id={id}
                options={["AMBS — suivi opérationnel", "Démonstration — données fictives"]}
                value={
                  workspace === "ambs"
                    ? "AMBS — suivi opérationnel"
                    : "Démonstration — données fictives"
                }
                onChange={(e) =>
                  switchWorkspace(e.target.value.startsWith("AMBS") ? "ambs" : "demo")
                }
              />
            )}
          </FormField>
          <p className="my-4 text-sm text-muted-foreground">
            Les deux espaces possèdent des sauvegardes indépendantes. Le suivi AMBS démarre avec les
            cibles et actions du document fourni, sans statistique inventée.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Site">ambs-agency.com</Field>
            <Field label="Compte">Local, sans authentification</Field>
          </div>
        </Panel>
        <Panel title="Conservation des données">
          <p className="font-semibold">
            {storageAvailable ? "Sauvegarde locale active" : "Stockage indisponible"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {storageAvailable
              ? "Les modifications restent dans ce navigateur. Exportez régulièrement une sauvegarde complète pour conserver aussi les relevés, les contrôles et les liens entre vos actions."
              : "Les modifications resteront uniquement en mémoire. Exportez-les avant de recharger ou de fermer la page."}
          </p>
          <Button className="mt-4" variant="outline" onClick={backup}>
            Exporter une sauvegarde complète
          </Button>
          <div className="mt-4">
            <FormField label="Restaurer une sauvegarde JSON">
              {(id) => (
                <Input
                  id={id}
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024)
                      return void toast.error("Fichier trop volumineux (10 Mo maximum)");
                    try {
                      const raw = JSON.parse(await file.text());
                      if (raw.format !== "ambs-workspace-v1" || raw.workspace !== workspace)
                        return void toast.error(
                          "Choisissez une sauvegarde du même espace de travail",
                        );
                      const parsed = stateSchema.safeParse(raw.data);
                      if (!parsed.success)
                        return void toast.error("Sauvegarde invalide ou incomplète");
                      setPending(parsed.data);
                    } catch {
                      toast.error("Impossible de lire cette sauvegarde");
                    }
                  }}
                />
              )}
            </FormField>
          </div>
        </Panel>
      </div>
      <Panel
        title="Sources de données"
        description="Aucune connexion externe active. Les boutons de saisie ne déclenchent pas d’API."
      >
        <div className="divide-y">
          {[
            "Google Search Console",
            "Google Analytics 4",
            "Bing Webmaster Tools",
            "Moteurs IA / observations GEO",
            "CRM commercial",
          ].map((name) => (
            <div className="flex items-center justify-between gap-3 py-3" key={name}>
              <span className="text-sm font-medium">{name}</span>
              <Badge variant="muted">Non connecté</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="Revenir au référentiel initial"
        description="Cette opération remplace uniquement les données de l’espace actif."
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Réinitialiser cet espace</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Réinitialiser l’espace {workspace === "ambs" ? "AMBS" : "de démonstration"} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Vos ajouts, relevés et modifications de cet espace seront remplacés par les données
                initiales. Exportez une sauvegarde complète avant de continuer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  reset();
                  toast.success("Espace réinitialisé");
                }}
              >
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Panel>
      <Dialog open={!!pending} onOpenChange={(value) => !value && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer cette sauvegarde ?</DialogTitle>
            <DialogDescription>
              Elle remplacera l’espace actif : {pending?.keywords.length} mots-clés,{" "}
              {pending?.actions.length} actions, {pending?.geoTests.length} observations GEO et{" "}
              {pending?.audits.length} contrôles. L’autre espace est conservé.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={backup}>
              Sauvegarder l’état actuel
            </Button>
            <Button variant="outline" onClick={() => setPending(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (pending && restore(pending)) {
                  setPending(null);
                  toast.success("Sauvegarde restaurée");
                }
              }}
            >
              Restaurer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
