import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLocation } from "wouter";
import { Search, FolderKanban, FileText } from "lucide-react";

interface SearchResult {
  projects?: Array<{ id: string; name: string; key: string }>;
  issues?: Array<{
    id: string;
    title: string;
    projectId: string;
    projectKey?: string;
    issueNumber: number;
  }>;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [, setLocation] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const { data: results } = useQuery<SearchResult>({
    queryKey: ["/api/search", `?q=${encodeURIComponent(debouncedQuery)}`],
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const handleSelect = useCallback(
    (type: string, id: string, projectId?: string) => {
      setOpen(false);
      setQuery("");
      if (type === "project") {
        setLocation(`/project/${id}/board`);
      } else if (type === "issue" && projectId) {
        setLocation(`/project/${projectId}/board`);
      }
    },
    [setLocation],
  );

  const projects = results?.projects ?? [];
  const issues = results?.issues ?? [];
  const hasResults = projects.length > 0 || issues.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg sm:max-w-lg [&>button]:hidden">
        <Command className="rounded-lg border-0" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search projects and issues..."
              value={query}
              onValueChange={setQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[400px]">
            {debouncedQuery.length >= 2 && !hasResults && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}

            {!debouncedQuery && (
              <CommandGroup heading="Tips">
                <CommandItem disabled>
                  <span className="text-muted-foreground text-sm">
                    Type to search for projects and issues...
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {projects.length > 0 && (
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={`project-${project.id}`}
                    value={`project-${project.id}`}
                    onSelect={() => handleSelect("project", project.id)}
                    className="cursor-pointer"
                  >
                    <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{project.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {project.key}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {projects.length > 0 && issues.length > 0 && <CommandSeparator />}

            {issues.length > 0 && (
              <CommandGroup heading="Issues">
                {issues.map((issue) => (
                  <CommandItem
                    key={`issue-${issue.id}`}
                    value={`issue-${issue.id}`}
                    onSelect={() =>
                      handleSelect("issue", issue.id, issue.projectId)
                    }
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mr-2 font-mono">
                      {issue.projectKey ? `${issue.projectKey}-${issue.issueNumber}` : `#${issue.issueNumber}`}
                    </span>
                    <span className="truncate">{issue.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
