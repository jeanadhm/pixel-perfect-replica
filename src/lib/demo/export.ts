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
  const csv = serializeCsv(rows);
  download(`${name}.csv`, new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  toast.success(`Export CSV généré : ${name}.csv`);
}

export async function createReportPdf(
  title: string,
  sections: { heading: string; lines: string[] }[],
  label = "SUIVI DOCUMENTÉ",
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(16);
  for (const line of doc.splitTextToSize(pdfText(title), 180)) {
    doc.text(line, 14, y);
    y += 7;
  }
  doc.setFontSize(9);
  doc.setTextColor(120);
  const header = `AMBS Visibility Hub · généré le ${new Date().toLocaleString("fr-FR")} · ${label}`;
  for (const line of doc.splitTextToSize(pdfText(header), 180)) {
    doc.text(line, 14, y);
    y += 4.5;
  }
  y += 6;
  doc.setTextColor(20);
  for (const s of sections) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(pdfText(s.heading), 14, y);
    y += 7;
    doc.setFontSize(10);
    for (const l of s.lines) {
      for (const part of doc.splitTextToSize(pdfText(l), 180)) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(part, 16, y);
        y += 5.5;
      }
    }
    y += 4;
  }
  return doc;
}

export async function exportPdf(
  title: string,
  sections: { heading: string; lines: string[] }[],
  label = "SUIVI DOCUMENTÉ",
) {
  const doc = await createReportPdf(title, sections, label);
  doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  toast.success("Rapport PDF généré");
}

export function serializeCsv(rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => {
    let text = String(value ?? "");
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return [
    columns.map(escape).join(";"),
    ...rows.map((row) => columns.map((key) => escape(row[key])).join(";")),
  ].join("\n");
}

// Helvetica’s built-in PDF encoding does not include French narrow no-break spaces.
const pdfText = (value: string) => value.replace(/[\u202f\u00a0]/g, " ");
