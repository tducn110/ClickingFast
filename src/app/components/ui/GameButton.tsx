import { forwardRef } from "react";
import { Button } from "./button";
import { cn } from "./utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { AudioManager } from "../../lib/audioManager";

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
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onClick={(event) => {
          if (!disabled && !loading) {
            AudioManager.playPop();
          }
          onClick?.(event);
        }}
        style={{ touchAction: "manipulation", lineHeight: "1" }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-all duration-200",
          "active:scale-95 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F4B93A]/45 focus-visible:ring-offset-2",
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
