import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty } from "./ui";

export interface Column<T> {
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number | null;
}
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  search,
  filters,
  label = "Rechercher",
}: {
  rows: T[];
  columns: Column<T>[];
  search: (row: T) => string;
  filters?: ReactNode;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState({ index: -1, dir: 1 });
  const filtered = rows.filter((r) =>
    search(r).toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")),
  );
  const getter = columns[sort.index]?.sort;
  if (getter)
    filtered.sort((a, b) => {
      const x = getter(a),
        y = getter(b);
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      return (
        (typeof x === "string" && typeof y === "string"
          ? x.localeCompare(y, "fr", { numeric: true })
          : x > y
            ? 1
            : x < y
              ? -1
              : 0) * sort.dir
      );
    });
  const count = Math.max(1, Math.ceil(filtered.length / 15));
  const current = Math.min(page, count - 1);
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label={label}
            placeholder={label + "…"}
            className="h-9 pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {filters}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} résultat(s)</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead
                key={col.label}
                aria-sort={
                  sort.index === i ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                }
              >
                {col.sort ? (
                  <button
                    className="whitespace-nowrap py-2 hover:text-foreground"
                    onClick={() => setSort({ index: i, dir: sort.index === i ? -sort.dir : 1 })}
                  >
                    {col.label} {sort.index === i ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                  </button>
                ) : (
                  col.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.slice(current * 15, (current + 1) * 15).map((row) => (
            <TableRow key={row.id}>
              {columns.map((col) => (
                <TableCell key={col.label}>{col.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!filtered.length && <Empty />}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground">
        <span>
          Page {current + 1} sur {count}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= count - 1}
            onClick={() => setPage(current + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
