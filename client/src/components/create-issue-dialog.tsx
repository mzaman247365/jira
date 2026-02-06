import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import type { IssueType, Priority, Status } from "@/lib/constants";

const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  type: z.enum(["epic", "story", "task", "bug"]),
  priority: z.enum(["highest", "high", "medium", "low", "lowest"]),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done"]).optional(),
  storyPoints: z.number().min(0).max(100).optional(),
});

type CreateIssueForm = z.infer<typeof createIssueSchema>;

export function CreateIssueDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultStatus?: Status;
}) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateIssueForm>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "task",
      priority: "medium",
      status: defaultStatus || "todo",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateIssueForm) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/issues`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      toast({ title: "Issue created" });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-issue-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ISSUE_TYPES) as [IssueType, { label: string }][]).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <IssueTypeIcon type={key} className="h-3.5 w-3.5" />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-issue-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PRIORITIES) as [Priority, { label: string }][]).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <PriorityIcon priority={key} className="h-3.5 w-3.5" />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Summary</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              {...register("title")}
              data-testid="input-issue-title"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a description..."
              className="min-h-[100px]"
              {...register("description")}
              data-testid="input-issue-description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-create-issue">
              {mutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
