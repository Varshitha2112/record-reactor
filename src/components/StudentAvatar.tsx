import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { cn } from "@/lib/utils";

interface Props {
  photoPath: string | null | undefined;
  name: string | null | undefined;
  className?: string;
  fallbackClassName?: string;
}

export const StudentAvatar = ({ photoPath, name, className, fallbackClassName }: Props) => {
  const url = useSignedUrl(photoPath);
  const initials = (name ?? "S").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Avatar className={className}>
      <AvatarImage src={url} />
      <AvatarFallback className={cn("bg-primary text-primary-foreground", fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
};
