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
    "bg-[#EED05E] text-[#4A4D4E] hover:bg-[#D6B847]",
  secondary:
    "bg-[#CC7069] text-white hover:bg-[#B85C56]",
  ghost:
    "bg-transparent text-[#4A4D4E] border border-[rgba(74,77,78,0.2)] hover:bg-[rgba(74,77,78,0.05)]",
  danger: "bg-[#CC7069] text-white hover:bg-[#B85C56]",
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
