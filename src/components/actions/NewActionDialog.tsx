import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { uid, useDemo } from "@/lib/demo/store";
import { RECURRENCES, nextDueDate } from "@/lib/demo/workflow";
import type { Action } from "@/lib/demo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, NativeSelect } from "@/components/shared/FormField";

export const ACTION_STATUSES = ["À faire", "En cours", "En attente", "Terminé", "Bloqué"] as const;
export const PRIORITIES = ["Critique", "Haute", "Moyenne", "Basse"] as const;
export function NewActionDialog({
  defaults = {},
  trigger,
  action,
}: {
  defaults?: Partial<Action>;
  trigger?: ReactNode;
  action?: Action;
}) {
  const { update, keywords, prompts, pages, actions, workspace, members } = useDemo();
  const [open, setOpen] = useState(false);
  const blank = (): Action => ({
    id: "",
    title: "",
    description: "",
    category: "SEO",
    priority: "Moyenne",
    owner: "À attribuer",
    start: new Date().toISOString().slice(0, 10),
    due: "",
    status: "À faire",
    target: "",
    deliverable: "",
    kpi: "",
    comments: "",
    recurrence: "Ponctuelle",
    keywordId: "",
    promptId: "",
    pageId: "",
    baseline: null,
    goal: null,
    result: null,
    metricUnit: "",
    proofUrl: "",
    ...defaults,
    ...action,
  });
  const [draft, setDraft] = useState(blank);
  const field = <K extends keyof Action>(key: K, value: Action[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) setDraft(blank());
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Nouvelle action
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{action ? "Modifier l’action" : "Nouvelle action"}</DialogTitle>
          <DialogDescription>
            Organisez le travail SEO et GEO. Les modifications sont enregistrées dans l’espace
            actif.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.title.trim()) return void toast.error("Le titre est obligatoire");
            if (draft.due && draft.due < draft.start)
              return void toast.error("L’échéance doit suivre la date de début");
            const saved = { ...draft, title: draft.title.trim(), id: action?.id ?? uid("act") };
            if (
              !(await update("actions", (items) =>
                action
                  ? items.map((item) => (item.id === action.id ? saved : item))
                  : [saved, ...items],
              ))
            )
              return;
            toast.success(action ? "Action mise à jour" : "Action ajoutée");
            setOpen(false);
          }}
        >
          <FormField label="Titre *">
            {(id) => (
              <Input
                id={id}
                required
                value={draft.title}
                onChange={(e) => field("title", e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Description">
            {(id) => (
              <Textarea
                id={id}
                value={draft.description}
                onChange={(e) => field("description", e.target.value)}
              />
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Catégorie">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={["SEO", "GEO"]}
                  value={draft.category}
                  onChange={(e) => field("category", e.target.value as Action["category"])}
                />
              )}
            </FormField>
            <FormField label="Priorité">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={PRIORITIES}
                  value={draft.priority}
                  onChange={(e) => field("priority", e.target.value as Action["priority"])}
                />
              )}
            </FormField>
            <FormField label="Responsable">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={[
                    ...new Set([
                      "À attribuer",
                      draft.owner,
                      ...actions.map((a) => a.owner),
                      ...members.map((m) => m.name),
                    ]),
                  ]}
                  value={draft.owner}
                  onChange={(e) => field("owner", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Statut">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={ACTION_STATUSES}
                  value={draft.status}
                  onChange={(e) => field("status", e.target.value as Action["status"])}
                />
              )}
            </FormField>
            <FormField label="Date de début">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  required
                  value={draft.start}
                  onChange={(e) => field("start", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Échéance *">
              {(id) => (
                <Input
                  id={id}
                  type="date"
                  required
                  min={draft.start}
                  value={draft.due}
                  onChange={(e) => field("due", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Cible">
              {(id) => (
                <Input
                  id={id}
                  value={draft.target}
                  onChange={(e) => field("target", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Livrable">
              {(id) => (
                <Input
                  id={id}
                  value={draft.deliverable}
                  onChange={(e) => field("deliverable", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Indicateur de réussite">
              {(id) => (
                <Input id={id} value={draft.kpi} onChange={(e) => field("kpi", e.target.value)} />
              )}
            </FormField>
          </div>
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">
              Relier l’action au travail à réaliser
            </legend>
            <FormField label="Mot-clé lié">
              {(id) => (
                <select
                  id={id}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                  value={draft.keywordId ?? ""}
                  onChange={(e) => field("keywordId", e.target.value)}
                >
                  <option value="">Aucun mot-clé</option>
                  {keywords.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.term}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Prompt IA lié">
              {(id) => (
                <select
                  id={id}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                  value={draft.promptId ?? ""}
                  onChange={(e) => field("promptId", e.target.value)}
                >
                  <option value="">Aucun prompt</option>
                  {prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.question} · {p.platform}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Page liée">
              {(id) => (
                <select
                  id={id}
                  className="h-10 w-full rounded-md border bg-card px-3 text-sm"
                  value={draft.pageId ?? ""}
                  onChange={(e) => field("pageId", e.target.value)}
                >
                  <option value="">Aucune page</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </fieldset>
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">Objectif et résultat mesuré</legend>
            <p className="text-xs text-muted-foreground">
              Comparez le même indicateur sur le même périmètre. Terminer une tâche ne prouve pas à
              lui seul un gain de visibilité.
            </p>
            <FormField label="Unité de mesure">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Ex. position, clics, taux de mention (%)"
                  value={draft.metricUnit ?? ""}
                  onChange={(e) => field("metricUnit", e.target.value)}
                />
              )}
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  ["baseline", "Valeur de départ"],
                  ["goal", "Objectif chiffré"],
                  ["result", "Résultat mesuré"],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label}>
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      step="any"
                      value={draft[key] ?? ""}
                      onChange={(e) =>
                        field(key, e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  )}
                </FormField>
              ))}
            </div>
            <FormField label="Lien de preuve / livrable">
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  pattern="https?://.*"
                  placeholder="https://…"
                  value={draft.proofUrl ?? ""}
                  onChange={(e) => field("proofUrl", e.target.value)}
                />
              )}
            </FormField>
          </fieldset>
          <FormField label="Récurrence">
            {(id) => (
              <NativeSelect
                id={id}
                options={RECURRENCES}
                value={draft.recurrence ?? "Ponctuelle"}
                onChange={(e) => field("recurrence", e.target.value as Action["recurrence"])}
              />
            )}
          </FormField>
          <FormField label="Commentaires">
            {(id) => (
              <Textarea
                id={id}
                value={draft.comments}
                onChange={(e) => field("comments", e.target.value)}
              />
            )}
          </FormField>
          {action &&
            action.status === "Terminé" &&
            action.recurrence &&
            action.recurrence !== "Ponctuelle" && (
              <div className="rounded-md bg-muted p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  La prochaine occurrence est créée sur demande, sans tâche automatique en
                  arrière-plan.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={actions.some((a) => a.parentActionId === action.id)}
                  onClick={async () => {
                    if (actions.some((a) => a.parentActionId === action.id)) return;
                    const next = {
                      ...action,
                      id: uid("act"),
                      parentActionId: action.id,
                      start: action.due,
                      due: nextDueDate(action.due, action.recurrence!),
                      status: "À faire" as const,
                      result: null,
                      proofUrl: "",
                      comments: "",
                    };
                    if (!(await update("actions", (items) => [next, ...items]))) return;
                    toast.success("Prochaine occurrence créée");
                    setOpen(false);
                  }}
                >
                  Créer la prochaine occurrence
                </Button>
              </div>
            )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
