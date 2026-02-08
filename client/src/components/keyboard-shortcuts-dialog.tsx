import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const SHORTCUT_GROUPS: Array<{ title: string; shortcuts: ShortcutEntry[] }> = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["c"], description: "Create issue" },
      { keys: ["/"], description: "Focus search" },
      { keys: ["\u2318", "K"], description: "Global search" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["g", "d"], description: "Go to dashboard" },
      { keys: ["g", "b"], description: "Go to board" },
      { keys: ["g", "l"], description: "Go to backlog" },
      { keys: ["g", "w"], description: "Go to my work" },
      { keys: ["g", "s"], description: "Go to search" },
    ],
  },
  {
    title: "Lists & Boards",
    shortcuts: [
      { keys: ["j"], description: "Move down in list" },
      { keys: ["k"], description: "Move up in list" },
      { keys: ["Enter"], description: "Open selected item" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["Escape"], description: "Close dialog / sheet" },
    ],
  },
];

function KeyBadge({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded border bg-muted text-[11px] font-mono font-medium text-muted-foreground shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group, groupIndex) => (
            <div key={group.title}>
              {groupIndex > 0 && <Separator className="mb-4" />}
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {group.title}
              </h4>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          {keyIndex > 0 && (
                            <span className="text-xs text-muted-foreground mx-0.5">
                              then
                            </span>
                          )}
                          <KeyBadge>{key}</KeyBadge>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
