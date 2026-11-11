"use client";
import { useState } from "react";
import { Plus, Play } from "lucide-react";
import { toast } from "sonner";
import { GeoRecordDialog } from "@/components/geo/GeoRecordDialog";
import { NewActionDialog } from "@/components/actions/NewActionDialog";
import { pageHead } from "@/lib/head";
import { uid, useDemo } from "@/lib/demo/store";
import { PLATFORMS } from "@/lib/demo/constants";
import type { GeoPrompt } from "@/lib/demo/types";
import { PageHeader, Kpi } from "@/components/shared/ui";
import { DataTable } from "@/components/shared/DataTable";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { FormField, NativeSelect } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function PromptsPage() {
  const { prompts, geoTests, update } = useDemo();
  const [platform, setPlatform] = useState("all");
  return (
    <>
      <PageHeader
        geo
        title="Prompts IA"
        description="Préparez des questions métier, exécutez-les dans le moteur choisi, puis enregistrez la réponse intégrale et son lien de preuve."
        actions={<PromptEditor />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Prompts suivis" value={prompts.length} />
        <Kpi label="Plateformes" value={new Set(prompts.map((p) => p.platform)).size} tone="geo" />
        <Kpi label="Catégories" value={new Set(prompts.map((p) => p.category)).size} />
        <Kpi label="Observations documentées" value={geoTests.length} />
      </div>
      <DataTable
        rows={prompts.filter((p) => platform === "all" || p.platform === platform)}
        search={(p) => `${p.question} ${p.category}`}
        label="Rechercher un prompt"
        filters={
          <FilterSelect
            label="Plateforme"
            value={platform}
            onChange={setPlatform}
            options={PLATFORMS}
            className="w-[205px]"
          />
        }
        columns={[
          {
            label: "Suivi",
            render: (p) => (geoTests.some((t) => t.promptId === p.id) ? "Observé" : "À tester"),
          },
          {
            label: "Question",
            render: (p) => (
              <div className="min-w-64 max-w-lg">
                <p className="font-medium">{p.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.category} · {p.intent}
                </p>
              </div>
            ),
          },
          { label: "Plateforme", sort: (p) => p.platform, render: (p) => p.platform },
          { label: "Fréquence prévue", render: (p) => p.frequency },
          {
            label: "Actions",
            render: (p) => (
              <div className="flex flex-wrap gap-2 min-w-80">
                <GeoRecordDialog prompt={p} />
                <NewActionDialog
                  defaults={{
                    title: `Améliorer la visibilité : ${p.question}`,
                    category: "GEO",
                    promptId: p.id,
                    target: p.platform,
                    kpi: "Taux de mention",
                    metricUnit: "%",
                  }}
                  trigger={
                    <Button size="sm" variant="outline">
                      Créer une action
                    </Button>
                  }
                />
                <PromptEditor prompt={p} />
              </div>
            ),
          },
        ]}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        La fréquence sert à préparer le suivi ; aucune exécution automatique n’est active.
      </p>
    </>
  );
}
function PromptEditor({ prompt }: { prompt?: GeoPrompt }) {
  const { families, prompts, update } = useDemo();
  const [open, setOpen] = useState(false);
  const blank = (): GeoPrompt =>
    prompt ?? {
      id: "",
      question: "",
      category: families[0] ?? "Marketing conversationnel",
      intent: "Commerciale",
      platform: "ChatGPT Search",
      frequency: "Hebdomadaire",
    };
  const [draft, setDraft] = useState(blank);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(blank());
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        {prompt ? (
          <Button size="sm" variant="ghost">
            Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            Nouveau prompt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prompt ? "Modifier le prompt" : "Nouveau prompt"}</DialogTitle>
          <DialogDescription>
            Définissez la question, son intention et le moteur à suivre.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const question = draft.question.trim();
            if (!question) return;
            if (
              prompts.some(
                (p) =>
                  p.id !== prompt?.id &&
                  p.question.toLowerCase() === question.toLowerCase() &&
                  p.platform === draft.platform,
              )
            )
              return void toast.error("Ce prompt existe déjà pour cette plateforme");
            const saved = { ...draft, question, id: prompt?.id ?? uid("pr") };
            if (
              !(await update("prompts", (items) =>
                prompt ? items.map((p) => (p.id === prompt.id ? saved : p)) : [saved, ...items],
              ))
            )
              return;
            setOpen(false);
            toast.success("Prompt enregistré");
          }}
        >
          <FormField label="Question *">
            {(id) => (
              <Textarea
                id={id}
                required
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Catégorie">
            {(id) => (
              <NativeSelect
                id={id}
                options={families}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Plateforme">
            {(id) => (
              <NativeSelect
                id={id}
                options={PLATFORMS}
                value={draft.platform}
                onChange={(e) =>
                  setDraft({ ...draft, platform: e.target.value as GeoPrompt["platform"] })
                }
              />
            )}
          </FormField>
          <FormField label="Intention">
            {(id) => (
              <NativeSelect
                id={id}
                options={["Informationnelle", "Commerciale", "Transactionnelle"]}
                value={draft.intent}
                onChange={(e) =>
                  setDraft({ ...draft, intent: e.target.value as GeoPrompt["intent"] })
                }
              />
            )}
          </FormField>
          <FormField label="Fréquence prévue">
            {(id) => (
              <NativeSelect
                id={id}
                options={["Hebdomadaire", "Bimensuelle", "Mensuelle"]}
                value={draft.frequency}
                onChange={(e) =>
                  setDraft({ ...draft, frequency: e.target.value as GeoPrompt["frequency"] })
                }
              />
            )}
          </FormField>
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

export default PromptsPage;
