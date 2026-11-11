import { useState } from "react";
import { toast } from "sonner";
import { uid, useDemo } from "@/lib/demo/store";
import { PLATFORMS } from "@/lib/demo/seed";
import type { GeoPrompt, GeoTest } from "@/lib/demo/types";
import { FormField, NativeSelect } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function GeoRecordDialog({ prompt, onSaved }: { prompt?: GeoPrompt; onSaved?: () => void }) {
  const { prompts, update } = useDemo();
  const [open, setOpen] = useState(false);
  const blank = () => ({
    promptId: prompt?.id ?? prompts[0]?.id ?? "",
    platform: prompt?.platform ?? ("ChatGPT Search" as GeoTest["platform"]),
    date: new Date().toISOString().slice(0, 10),
    mentioned: false,
    recommended: false,
    accuracy: "Exacte" as GeoTest["accuracy"],
    position: "",
    sources: "",
    competitors: "",
    response: "",
    evidenceUrl: "",
  });
  const [draft, setDraft] = useState(blank);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) setDraft(blank());
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size={prompt ? "sm" : "default"}>
          Saisir un résultat GEO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Enregistrer une observation GEO</DialogTitle>
          <DialogDescription>
            Copiez une réponse que vous avez réellement observée. Ce formulaire ne lance aucune
            requête IA ; les saisies manuelles restent séparées des simulations.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const selected = prompts.find((p) => p.id === draft.promptId);
            if (!selected || !draft.response.trim())
              return void toast.error("Choisissez un prompt et copiez sa réponse");
            if (!draft.date || draft.date > new Date().toISOString().slice(0, 10))
              return void toast.error("La date du test ne peut pas être future");
            const accuracy = draft.mentioned ? draft.accuracy : "—";
            const recommended = draft.mentioned && draft.recommended && accuracy !== "Incorrecte";
            const test: GeoTest = {
              id: uid("geo"),
              origin: "Saisie manuelle",
              promptId: selected.id,
              siteId: selected.siteId,
              question: selected.question,
              date: `${draft.date}T12:00:00.000Z`,
              platform: draft.platform,
              mentioned: draft.mentioned,
              recommended,
              accuracy,
              mentionPosition: draft.mentioned && draft.position ? Number(draft.position) : null,
              sources: draft.sources
                .split(/[,;\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
              competitors: draft.competitors
                .split(/[,;\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
              response: draft.response.trim(),
              evidenceUrl: draft.evidenceUrl,
              status:
                accuracy === "Incorrecte"
                  ? "Réponse incorrecte"
                  : recommended
                    ? "Mentionnée et recommandée"
                    : draft.mentioned
                      ? "Mentionnée sans recommandation"
                      : "Non mentionnée",
            };
            update("geoTests", (tests) =>
              [test, ...tests].sort((a, b) => b.date.localeCompare(a.date)),
            );
            setOpen(false);
            toast.success("Observation GEO enregistrée", {
              description: "Saisie manuelle conservée localement.",
            });
            onSaved?.();
          }}
        >
          <FormField label="Prompt observé">
            {(id) => (
              <select
                id={id}
                required
                className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                value={draft.promptId}
                onChange={(e) => {
                  const selected = prompts.find((p) => p.id === e.target.value);
                  setDraft({
                    ...draft,
                    promptId: e.target.value,
                    platform: selected?.platform ?? draft.platform,
                  });
                }}
              >
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.question}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Moteur observé">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={PLATFORMS}
                  value={draft.platform}
                  onChange={(e) =>
                    setDraft({ ...draft, platform: e.target.value as GeoTest["platform"] })
                  }
                />
              )}
            </FormField>
            <FormField label="Date de l’observation">
              {(id) => (
                <Input
                  id={id}
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              )}
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.mentioned}
              onChange={(e) =>
                setDraft({ ...draft, mentioned: e.target.checked, recommended: false })
              }
            />
            AMBS est mentionnée
          </label>
          {draft.mentioned && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.recommended}
                  onChange={(e) => setDraft({ ...draft, recommended: e.target.checked })}
                />
                AMBS est recommandée
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Exactitude de la description">
                  {(id) => (
                    <NativeSelect
                      id={id}
                      options={["Exacte", "Partielle", "Incorrecte"]}
                      value={draft.accuracy}
                      onChange={(e) =>
                        setDraft({ ...draft, accuracy: e.target.value as GeoTest["accuracy"] })
                      }
                    />
                  )}
                </FormField>
                <FormField label="Rang de mention (optionnel)">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min="1"
                      step="1"
                      value={draft.position}
                      onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                    />
                  )}
                </FormField>
              </div>
            </>
          )}
          <FormField label="Réponse observée *">
            {(id) => (
              <Textarea
                id={id}
                rows={5}
                required
                value={draft.response}
                onChange={(e) => setDraft({ ...draft, response: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Sources citées (une par ligne)">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.sources}
                onChange={(e) => setDraft({ ...draft, sources: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Concurrents cités">
            {(id) => (
              <Input
                id={id}
                placeholder="Séparés par des virgules"
                value={draft.competitors}
                onChange={(e) => setDraft({ ...draft, competitors: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Lien vers la réponse ou la preuve">
            {(id) => (
              <Input
                id={id}
                type="url"
                pattern="https?://.*"
                value={draft.evidenceUrl}
                onChange={(e) => setDraft({ ...draft, evidenceUrl: e.target.value })}
              />
            )}
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer l’observation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
