import { toast } from "sonner";

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("Aucune donnée à exporter");
    return;
  }
  const cols = Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
  download(`${name}.csv`, new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  toast.success(`Export CSV généré : ${name}.csv`);
}

export async function exportPdf(title: string, sections: { heading: string; lines: string[] }[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16); doc.text(title, 14, y); y += 7;
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`AMBS Visibility Hub · généré le ${new Date().toLocaleString("fr-FR")} · DONNÉES DE DÉMONSTRATION`, 14, y); y += 10;
  doc.setTextColor(20);
  for (const s of sections) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.text(s.heading, 14, y); y += 7;
    doc.setFontSize(10);
    for (const l of s.lines) {
      for (const part of doc.splitTextToSize(l, 180)) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(part, 16, y); y += 5.5;
      }
    }
    y += 4;
  }
  doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  toast.success("Rapport PDF généré");
}
