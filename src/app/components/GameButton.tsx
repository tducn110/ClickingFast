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
    "bg-gradient-to-b from-[#EED05E] to-[#EED05E] text-white border-[3px] border-[#D6B847] shadow-[0_8px_22px_rgba(232,116,50,0.35)] hover:shadow-[0_12px_30px_rgba(232,116,50,0.5)]",
  secondary:
    "bg-white/90 text-[#4A4D4E] font-bold border-2 border-[#7A7D7E] hover:bg-white hover:border-[#4A4D4E]",
  ghost:
    "bg-transparent text-[#7A7D7E] hover:text-[#4A4D4E] hover:bg-[#FFFFFF]/80 border border-[rgba(74,77,78,0.1)]",
  danger: "bg-[#CC7069] text-white hover:bg-[#B85C56] shadow-[0_2px_12px_rgba(204,112,105,0.3)]",
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
