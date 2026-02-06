import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function ProjectAvatar({
  name,
  color = "#4C9AFF",
  size = "md",
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback
        className="text-white font-semibold rounded-md"
        style={{ backgroundColor: color }}
      >
        {name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
