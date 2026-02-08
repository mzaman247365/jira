import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { IssueTypeIcon } from "@/components/issue-type-icon";
import { PriorityIcon } from "@/components/priority-icon";
import type { IssueType, Priority, Status } from "@/lib/constants";
import type { Sprint } from "@shared/schema";

const nanToUndefined = z.preprocess(
  (val) => (typeof val === "number" && isNaN(val) ? undefined : val),
  z.number().min(0).max(100).optional()
);

const nanToUndefinedNoMax = z.preprocess(
  (val) => (typeof val === "number" && isNaN(val) ? undefined : val),
  z.number().min(0).optional()
);

const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().optional()
);

const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  type: z.enum(["epic", "story", "task", "bug", "sub_task"]),
  priority: z.enum(["highest", "high", "medium", "low", "lowest"]),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done"]).optional(),
  storyPoints: nanToUndefined,
  parentId: emptyStringToUndefined,
  sprintId: emptyStringToUndefined,
  originalEstimate: nanToUndefinedNoMax,
  startDate: emptyStringToUndefined,
  dueDate: emptyStringToUndefined,
});

type CreateIssueForm = z.infer<typeof createIssueSchema>;

export function CreateIssueDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatus,
  defaultParentId,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultStatus?: Status;
  defaultParentId?: string;
  defaultType?: IssueType;
}) {
  const { toast } = useToast();

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ["/api/projects", projectId, "sprints"],
    enabled: open,
  });

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
      type: defaultType || "task",
      priority: "medium",
      status: defaultStatus || "todo",
      parentId: defaultParentId,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateIssueForm) => {
      const payload: any = { ...data };
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      if (payload.dueDate) payload.dueDate = new Date(payload.dueDate);
      if (payload.sprintId === "none") delete payload.sprintId;
      const res = await apiRequest("POST", `/api/projects/${projectId}/issues`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/issues/recent"] });
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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

          {/* Sprint */}
          <div className="space-y-2">
            <Label>Sprint</Label>
            <Controller
              name="sprintId"
              control={control}
              render={({ field }) => (
                <Select value={field.value || "none"} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="No sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sprint</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.status === "active" ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Story Points & Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Story Points</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                {...register("storyPoints", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Original Estimate (min)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                {...register("originalEstimate", { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
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
