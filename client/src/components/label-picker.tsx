import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Label } from "@shared/schema";

interface LabelPickerProps {
  issueId: string;
  projectId: string;
  selectedLabelIds: string[];
  onToggle: (labelId: string, add: boolean) => void;
}

export function LabelPicker({ issueId, projectId, selectedLabelIds, onToggle }: LabelPickerProps) {
  const [open, setOpen] = useState(false);

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ["/api/projects", projectId, "labels"],
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8">
          <Tag className="h-3.5 w-3.5" />
          Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels..." />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => {
                const isSelected = selectedLabelIds.includes(label.id);
                return (
                  <CommandItem
                    key={label.id}
                    value={label.name}
                    onSelect={() => onToggle(label.id, !isSelected)}
                  >
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color || "#6B778C" }}
                    />
                    <span className="flex-1 truncate">{label.name}</span>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className="p-2">
            <p className="text-xs text-muted-foreground text-center cursor-default">
              Manage Labels
            </p>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
