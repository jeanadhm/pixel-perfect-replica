import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { uid, useDemo } from "@/lib/demo/store";
import type { Keyword, KeywordPlan } from "@/lib/demo/types";
import {
  KEYWORD_STAGES,
  PLACEMENTS,
  keywordPlan,
  parseKeywordLines,
  withMeasurement,
} from "@/lib/demo/workflow";
import { fdate, nf } from "@/lib/demo/utils";
import { FormField, NativeSelect } from "@/components/shared/FormField";
import { Kpi, Empty } from "@/components/shared/ui";
import { ActBadge, PriBadge } from "@/components/shared/badges";
import { NewActionDialog, PRIORITIES } from "@/components/actions/NewActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function KeywordPlanBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const { keywords, members } = useDemo();
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("Tous les responsables");
  const [stage, setStage] = useState("Toutes les étapes");
  const filtered = keywords.filter(
    (k) =>
      k.term.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")) &&
      (owner === "Tous les responsables" || keywordPlan(k).owner === owner) &&
      (stage === "Toutes les étapes" || keywordPlan(k).stage === stage),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Rechercher dans le plan de mots-clés"
          className="sm:w-72"
          placeholder="Rechercher dans le plan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="w-full sm:w-60">
          <NativeSelect
            aria-label="Responsable du mot-clé"
            options={["Tous les responsables", "À attribuer", ...members.map((m) => m.name)]}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-52">
          <NativeSelect
            aria-label="Étape du plan"
            options={["Toutes les étapes", ...KEYWORD_STAGES]}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Une position Google ne signifie pas qu’un mot-clé est déjà intégré. Qualifiez son état
        depuis sa fiche.
      </p>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {KEYWORD_STAGES.filter((s) => stage === "Toutes les étapes" || s === stage).map((s) => {
          const rows = filtered.filter((k) => keywordPlan(k).stage === s);
          return (
            <section key={s} className="rounded-lg border bg-muted/40">
              <div className="flex items-center justify-between border-b p-3">
                <h2 className="text-sm font-semibold">{s}</h2>
                <Badge variant="muted">{rows.length}</Badge>
              </div>
              <div className="max-h-[500px] space-y-2 overflow-y-auto p-3">
                {!rows.length && <Empty text="Aucun mot-clé à cette étape." />}
                {rows.map((k) => {
                  const plan = keywordPlan(k);
                  return (
                    <button
                      key={k.id}
                      onClick={() => onOpen(k.id)}
                      className="card-surface block w-full p-3 text-left transition hover:border-primary"
                    >
                      <p className="text-sm font-semibold">{k.term}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{k.family}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <PriBadge s={plan.priority} />
                        <span className="text-xs text-muted-foreground">
                          {plan.targetPosition
                            ? `Objectif top ${plan.targetPosition}`
                            : "Objectif à définir"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {plan.owner || "Non attribué"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
export function KeywordWorkflow({ keyword }: { keyword: Keyword }) {
  const { update, actions, workspace, keywords, families, members } = useDemo();
  const [details, setDetails] = useState({
    term: keyword.term,
    family: keyword.family,
    intent: keyword.intent,
    volume: keyword.volume === null ? "" : String(keyword.volume),
    difficulty: keyword.difficulty === null ? "" : String(keyword.difficulty),
  });
  const [plan, setPlan] = useState<KeywordPlan>(() => keywordPlan(keyword));
  const related = actions.filter((a) => a.keywordId === keyword.id);
  return (
    <div className="mt-6 space-y-6 border-t pt-6">
      <div>
        <h3 className="mb-1 font-semibold">Plan d’intégration</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Précisez où travailler cette expression et le résultat attendu.
        </p>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              !details.term.trim() ||
              (details.term.trim() !== keyword.term &&
                keywords.some(
                  (k) =>
                    k.id !== keyword.id &&
                    k.siteId === keyword.siteId &&
                    k.url === keyword.url &&
                    k.term.toLocaleLowerCase("fr") === details.term.trim().toLocaleLowerCase("fr"),
                ))
            )
              return void toast.error("Expression vide ou déjà suivie");
            if (plan.stage === "Intégré" && (!plan.contentUrl.trim() || !plan.placements.length))
              return void toast.error(
                "Indiquez la page et au moins un emplacement pour marquer ce mot-clé comme intégré",
              );
            const saved = { ...plan, updatedAt: new Date().toISOString() };
            if (
              !(await update("keywords", (items) =>
                items.map((k) =>
                  k.id === keyword.id
                    ? {
                        ...k,
                        term: details.term.trim(),
                        family: details.family,
                        intent: details.intent,
                        volume: details.volume === "" ? null : Number(details.volume),
                        difficulty: details.difficulty === "" ? null : Number(details.difficulty),
                        plan: saved,
                        url: saved.contentUrl || k.url,
                      }
                    : k,
                ),
              ))
            )
              return;
            setPlan(saved);
            toast.success("Plan d’intégration enregistré");
          }}
        >
          <FormField label="Expression suivie">
            {(id) => (
              <Input
                id={id}
                required
                value={details.term}
                onChange={(e) => setDetails({ ...details, term: e.target.value })}
              />
            )}
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Famille de l’expression">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={families}
                  value={details.family}
                  onChange={(e) => setDetails({ ...details, family: e.target.value })}
                />
              )}
            </FormField>
            <FormField label="Intention de recherche">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={["Informationnelle", "Commerciale", "Transactionnelle"]}
                  value={details.intent}
                  onChange={(e) =>
                    setDetails({ ...details, intent: e.target.value as Keyword["intent"] })
                  }
                />
              )}
            </FormField>
            <FormField label="Volume mensuel (vide = inconnu)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min="0"
                  step="1"
                  value={details.volume}
                  onChange={(e) => setDetails({ ...details, volume: e.target.value })}
                />
              )}
            </FormField>
            <FormField label="Difficulté (vide = inconnue)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={details.difficulty}
                  onChange={(e) => setDetails({ ...details, difficulty: e.target.value })}
                />
              )}
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Étape du mot-clé">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={KEYWORD_STAGES}
                  value={plan.stage}
                  onChange={(e) =>
                    setPlan({ ...plan, stage: e.target.value as KeywordPlan["stage"] })
                  }
                />
              )}
            </FormField>
            <FormField label="Priorité du mot-clé">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={PRIORITIES}
                  value={plan.priority}
                  onChange={(e) =>
                    setPlan({ ...plan, priority: e.target.value as KeywordPlan["priority"] })
                  }
                />
              )}
            </FormField>
            <FormField label="Responsable du mot-clé">
              {(id) => (
                <NativeSelect
                  id={id}
                  options={[
                    ...new Set([
                      "Non attribué",
                      ...actions.map((a) => a.owner),
                      ...members.map((m) => m.name),
                    ]),
                  ]}
                  value={plan.owner || "Non attribué"}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      owner: e.target.value === "Non attribué" ? "" : e.target.value,
                    })
                  }
                />
              )}
            </FormField>
            <FormField label="Position cible (1–100)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  placeholder="À définir"
                  value={plan.targetPosition ?? ""}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      targetPosition: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              )}
            </FormField>
          </div>
          <FormField label="Page cible ou page intégrée">
            {(id) => (
              <Input
                id={id}
                type="url"
                pattern="https?://.*"
                value={plan.contentUrl}
                onChange={(e) => setPlan({ ...plan, contentUrl: e.target.value })}
              />
            )}
          </FormField>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Emplacements travaillés</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {PLACEMENTS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plan.placements.includes(p)}
                    onChange={(e) =>
                      setPlan({
                        ...plan,
                        placements: e.target.checked
                          ? [...plan.placements, p]
                          : plan.placements.filter((v) => v !== p),
                      })
                    }
                  />
                  {p}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" variant="outline">
            Enregistrer le plan
          </Button>
        </form>
      </div>
      <KeywordMeasurements keyword={keyword} />
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Actions liées ({related.length})</h3>
          <NewActionDialog
            defaults={{
              title: `Optimiser « ${keyword.term} »`,
              category: "SEO",
              keywordId: keyword.id,
              target: keyword.term,
              kpi: "Position Google",
              metricUnit: "position",
              goal: plan.targetPosition,
            }}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Lier une action
              </Button>
            }
          />
        </div>
        {!related.length ? (
          <p className="text-sm text-muted-foreground">Aucune action liée à cette expression.</p>
        ) : (
          <ul className="space-y-2">
            {related.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <NewActionDialog
                  action={a}
                  trigger={
                    <button className="text-left text-sm font-medium hover:text-primary">
                      {a.title}
                    </button>
                  }
                />
                <ActBadge s={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
function KeywordMeasurements({ keyword }: { keyword: Keyword }) {
  const { update } = useDemo();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    position: "",
    impressions: "0",
    clicks: "0",
    source: "Google Search Console",
    notes: "",
  });
  const [replaceDate, setReplaceDate] = useState<string | null>(null);
  const observations = keyword.measurements ?? [];
  const latest = observations.at(-1),
    prior = observations.at(-2);
  const save = async () => {
    const measurement = {
      id: uid("measurement"),
      date: form.date,
      position: form.position === "" ? null : Number(form.position),
      impressions: Number(form.impressions),
      clicks: Number(form.clicks),
      source: form.source,
      notes: form.notes.trim(),
    };
    if (!measurement.date || measurement.date > new Date().toISOString().slice(0, 10))
      return void toast.error("Choisissez une date passée ou la date du jour");
    if (
      measurement.position !== null &&
      (!Number.isFinite(measurement.position) ||
        measurement.position < 1 ||
        measurement.position > 100)
    )
      return void toast.error("La position doit être entre 1 et 100");
    if (
      ![measurement.impressions, measurement.clicks].every((n) => Number.isInteger(n) && n >= 0) ||
      measurement.clicks > measurement.impressions
    )
      return void toast.error(
        "Vérifiez les clics et impressions : nombres entiers positifs, clics ≤ impressions",
      );
    if (
      !(await update("keywords", (items) =>
        items.map((k) => (k.id === keyword.id ? withMeasurement(k, measurement) : k)),
      ))
    )
      return;
    setReplaceDate(null);
    toast.success("Relevé manuel enregistré");
  };
  return (
    <div>
      <h3 className="mb-2 font-semibold">Mesurer les améliorations</h3>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Saisissez des relevés portant sur la même durée, le même pays et le même appareil. La
        comparaison utilise les deux derniers relevés disponibles, avec leur source et leur période
        initiales.
      </p>
      {latest && prior ? (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Kpi
            label="Places gagnées"
            value={
              latest.position !== null && prior.position !== null
                ? nf(prior.position - latest.position, 1)
                : "—"
            }
            sub={`${fdate(prior.date)} → ${fdate(latest.date)}`}
          />
          <Kpi
            label="Évolution des clics"
            value={`${latest.clicks - prior.clicks > 0 ? "+" : ""}${nf(latest.clicks - prior.clicks)}`}
            sub="Différence entre vos deux relevés."
          />
        </div>
      ) : (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm">
          {observations.length
            ? "Ajoutez un second relevé à une autre date pour mesurer l’évolution."
            : "Aucun relevé manuel : commencez par enregistrer votre situation de départ."}
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (observations.some((m) => m.date === form.date)) setReplaceDate(form.date);
          else save();
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Date du relevé">
            {(id) => (
              <Input
                id={id}
                required
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Position (vide = hors top 100)">
            {(id) => (
              <Input
                id={id}
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Impressions du relevé">
            {(id) => (
              <Input
                id={id}
                required
                type="number"
                min="0"
                step="1"
                value={form.impressions}
                onChange={(e) => setForm({ ...form, impressions: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Clics du relevé">
            {(id) => (
              <Input
                id={id}
                required
                type="number"
                min="0"
                step="1"
                value={form.clicks}
                onChange={(e) => setForm({ ...form, clicks: e.target.value })}
              />
            )}
          </FormField>
        </div>
        <FormField label="Source du relevé">
          {(id) => (
            <NativeSelect
              id={id}
              options={["Google Search Console", "Outil de suivi SEO", "Vérification manuelle"]}
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Périmètre / notes du relevé">
          {(id) => (
            <Textarea
              id={id}
              placeholder="Ex. 7 derniers jours · France · mobile"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          )}
        </FormField>
        <Button type="submit" variant="outline">
          Enregistrer le relevé
        </Button>
      </form>
      {observations.length > 0 && (
        <div className="mt-4 max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted">
                <th className="p-2">Date</th>
                <th className="p-2">Position</th>
                <th className="p-2">Impressions</th>
                <th className="p-2">Clics</th>
                <th className="p-2">Source / notes</th>
              </tr>
            </thead>
            <tbody>
              {[...observations].reverse().map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="whitespace-nowrap p-2">{fdate(m.date)}</td>
                  <td className="p-2">{m.position ?? "Hors top 100"}</td>
                  <td className="p-2">{nf(m.impressions)}</td>
                  <td className="p-2">{nf(m.clicks)}</td>
                  <td className="min-w-36 p-2">
                    {m.source}
                    <span className="block text-muted-foreground">{m.notes}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!replaceDate} onOpenChange={(v) => !v && setReplaceDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remplacer ce relevé ?</DialogTitle>
            <DialogDescription>
              Un relevé existe déjà pour le {replaceDate ? fdate(replaceDate) : ""}. Le remplacer
              modifiera l’historique et la comparaison.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReplaceDate(null)}>
              Annuler
            </Button>
            <Button onClick={save}>Remplacer le relevé</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function BulkKeywordsDialog() {
  const { keywords, families, update } = useDemo();
  const [open, setOpen] = useState(false),
    [text, setText] = useState("");
  const [family, setFamily] = useState(families[0] ?? "Marketing conversationnel");
  const preview = parseKeywordLines(
    text,
    keywords.map((k) => k.term),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Ajouter une liste</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une liste de mots-clés</DialogTitle>
          <DialogDescription>
            Collez une expression par ligne. Les doublons sont ignorés ; les nouveaux mots-clés
            entrent dans « À cibler » sans position inventée.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!preview.terms.length) return;
            const additions: Keyword[] = preview.terms.map((term) => ({
              id: uid("kw"),
              term,
              family,
              intent: "Commerciale",
              position: null,
              previous: null,
              volume: null,
              difficulty: null,
              url: "",
              history: [],
              competitors: [],
              lastCheck: "",
              notes: "",
              plan: {
                stage: "À cibler",
                priority: "Moyenne",
                owner: "",
                targetPosition: null,
                placements: [],
                contentUrl: "",
                updatedAt: new Date().toISOString(),
              },
            }));
            if (!(await update("keywords", (items) => [...additions, ...items]))) return;
            toast.success(`${additions.length} mots-clés ajoutés au plan`);
            setText("");
            setOpen(false);
          }}
        >
          <FormField label="Famille des mots-clés importés">
            {(id) => (
              <NativeSelect
                id={id}
                options={families}
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Liste des expressions">
            {(id) => (
              <Textarea
                id={id}
                rows={8}
                required
                placeholder={"agence marketing conversationnel\nchatbot whatsapp entreprise"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </FormField>
          <p className="text-sm text-muted-foreground">
            {preview.terms.length} nouveau(x) · {preview.duplicates} doublon(s) ignoré(s)
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={!preview.terms.length}>
              Ajouter au plan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
