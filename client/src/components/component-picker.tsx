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
} from "@/components/ui/command";
import { Package, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Component as ProjectComponent } from "@shared/schema";

interface ComponentPickerProps {
  issueId: string;
  projectId: string;
  selectedComponentIds: string[];
  onToggle: (componentId: string, add: boolean) => void;
}

export function ComponentPicker({ issueId, projectId, selectedComponentIds, onToggle }: ComponentPickerProps) {
  const [open, setOpen] = useState(false);

  const { data: components = [] } = useQuery<ProjectComponent[]>({
    queryKey: ["/api/projects", projectId, "components"],
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8">
          <Package className="h-3.5 w-3.5" />
          Components
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search components..." />
          <CommandList>
            <CommandEmpty>No components found.</CommandEmpty>
            <CommandGroup>
              {components.map((component) => {
                const isSelected = selectedComponentIds.includes(component.id);
                return (
                  <CommandItem
                    key={component.id}
                    value={component.name}
                    onSelect={() => onToggle(component.id, !isSelected)}
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{component.name}</span>
                      {component.description && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {component.description}
                        </span>
                      )}
                    </div>
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}
