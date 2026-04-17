import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string | null;
  username?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, imageUrl, username, size = "md", ...props }, ref) => {
    const initial = username ? username.charAt(0).toUpperCase() : "?";

    if (imageUrl) {
      return (
        <div
          ref={ref}
          className={cn(
            "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-muted",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <img
            src={imageUrl}
            alt={username || "avatar"}
            className="h-full w-full object-cover"
            onError={(e) => {
              // 加载失败时隐藏图片，显示首字母
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
          <span className="hidden absolute inset-0 flex items-center justify-center font-medium text-muted-foreground">
            {initial}
          </span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {initial}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
