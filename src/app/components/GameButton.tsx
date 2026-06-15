import { forwardRef } from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type GameButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type GameButtonSize = "sm" | "md" | "lg";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<GameButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_12px_-3px_rgba(213,183,71,0.4)]",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_2px_12px_-3px_rgba(197,100,92,0.3)]",
  ghost:
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const sizeClasses: Record<GameButtonSize, string> = {
  sm: "px-5 py-2 text-[13px]",
  md: "px-8 py-3 text-[15px]",
  lg: "px-10 py-3.5 text-[16px]",
};

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{ touchAction: "manipulation", lineHeight: "1" }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200",
          "active:scale-95 cursor-pointer",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

GameButton.displayName = "GameButton";
