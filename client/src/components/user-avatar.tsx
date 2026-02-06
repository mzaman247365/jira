import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ firstName, lastName, imageUrl, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-7 w-7 text-xs",
    lg: "h-9 w-9 text-sm",
  };

  const initials = `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";

  return (
    <Avatar className={sizeClasses[size]}>
      {imageUrl && <AvatarImage src={imageUrl} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
