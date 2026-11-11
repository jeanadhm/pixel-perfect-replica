import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { Label } from "@/components/ui/label";
export function FormField({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  );
}
export function NativeSelect({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[] }) {
  return (
    <select
      {...props}
      className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}
