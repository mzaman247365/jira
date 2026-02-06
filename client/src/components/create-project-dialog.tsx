import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_COLORS } from "@/lib/constants";
import { useLocation } from "wouter";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  key: z.string().min(2, "Key must be 2-10 characters").max(10).regex(/^[A-Z]+$/, "Key must be uppercase letters only"),
  description: z.string().optional(),
  avatarColor: z.string().default("#4C9AFF"),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", key: "", description: "", avatarColor: "#4C9AFF" },
  });

  const selectedColor = watch("avatarColor");

  const mutation = useMutation({
    mutationFn: async (data: CreateProjectForm) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created", description: `${project.name} is ready to go.` });
      reset();
      onOpenChange(false);
      setLocation(`/project/${project.id}/board`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    register("name").onChange(e);
    const key = name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase();
    if (key) setValue("key", key);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Project"
              {...register("name")}
              onChange={onNameChange}
              data-testid="input-project-name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              placeholder="PROJ"
              {...register("key")}
              data-testid="input-project-key"
            />
            {errors.key && <p className="text-sm text-destructive">{errors.key.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this project about?"
              {...register("description")}
              data-testid="input-project-description"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("avatarColor", color)}
                  className={`h-8 w-8 rounded-md transition-transform ${
                    selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  data-testid={`button-color-${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-create-project">
              {mutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
