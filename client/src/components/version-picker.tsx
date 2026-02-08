import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VERSION_STATUSES } from "@/lib/constants";
import type { Version } from "@shared/schema";
import type { VersionStatus } from "@/lib/constants";

interface VersionPickerProps {
  projectId: string;
  value: string | null;
  onChange: (versionId: string | null) => void;
  label?: string;
}

export function VersionPicker({ projectId, value, onChange, label }: VersionPickerProps) {
  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: ["/api/projects", projectId, "versions"],
  });

  return (
    <div className="space-y-1.5">
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <Select
        value={value || "none"}
        onValueChange={(v) => onChange(v === "none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {versions.map((version) => {
            const statusInfo = VERSION_STATUSES[version.status as VersionStatus];
            return (
              <SelectItem key={version.id} value={version.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusInfo?.color || "#6B778C" }}
                  />
                  {version.name}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
