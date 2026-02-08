import { Badge } from "@/components/ui/badge";
import type { Label } from "@shared/schema";

export function LabelBadge({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <Badge
      className="text-white text-xs font-medium gap-1"
      style={{ backgroundColor: label.color || "#6B778C" }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-white/80"
        >
          ×
        </button>
      )}
    </Badge>
  );
}
