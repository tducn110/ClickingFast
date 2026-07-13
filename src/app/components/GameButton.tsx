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
    "bg-gradient-to-b from-[#f08a48] to-[#e87432] text-white border-[3px] border-[#b85a22] shadow-[0_8px_22px_rgba(232,116,50,0.35)] hover:shadow-[0_12px_30px_rgba(232,116,50,0.5)]",
  secondary:
    "bg-white/90 text-[#2b2620] font-bold border-2 border-[#8a7d65] hover:bg-white hover:border-[#6b5d4a]",
  ghost:
    "bg-transparent text-[#8a7d65] hover:text-[#2b2620] hover:bg-[#f5ecd7]/80 border border-[rgba(138,125,101,0.3)]",
  danger: "bg-[#c23838] text-white hover:bg-[#a82e2e] shadow-[0_2px_12px_rgba(194,56,56,0.3)]",
};

const sizeClasses: Record<GameButtonSize, string> = {
  sm: "px-5 py-2 text-[13px]",
  md: "px-8 py-3 text-[15px]",
  lg: "px-10 py-[16px] text-[16px]",
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
          "inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-all duration-200",
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
