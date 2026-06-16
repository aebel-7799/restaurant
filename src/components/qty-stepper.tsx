import { Minus, Plus } from "lucide-react";

export function QtyStepper({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  const padding = size === "md" ? "px-3 py-2" : "px-2.5 py-1.5";
  return (
    <div className={`inline-flex items-center gap-3 rounded-full bg-muted ${padding}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="text-brand"
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-4 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="text-brand"
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
