import { memo } from "react";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderRequirement } from "../game/gameRules";
import { ITEM_REGISTRY } from "../game/itemRegistry";
import { FruitAssetImage } from "../ui/FruitAssetImage";

function formatSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

export interface OrderCardProps {
  requirements: OrderRequirement[];
  timeRemainingMs: number;
  timeLimitMs: number;
  orderLabel: string;
  incomingLabel: string;
}

export const OrderCard = memo(function OrderCard({
  requirements,
  timeRemainingMs,
  timeLimitMs,
  orderLabel,
  incomingLabel,
}: OrderCardProps) {
  const { t } = useTranslation();
  const hasOrder = requirements.length > 0;
  const orderTimeProgress = hasOrder
    ? Math.max(
        0,
        Math.min(
          100,
          (timeRemainingMs / Math.max(1, timeLimitMs)) * 100
        )
      )
    : 0;
  const orderTimeColor =
    orderTimeProgress <= 25
      ? "#ef4b37"
      : orderTimeProgress <= 50
      ? "#f2a62d"
      : "#82bd18";

  return (
    <section
      aria-label={orderLabel}
      className="gameplayHudCard gameplayOrderCard relative min-h-[calc(102*var(--su))] overflow-hidden rounded-[calc(17*var(--su))] border-2 border-[#e2b56d] px-2 py-2"
      style={{
        background: "linear-gradient(180deg,rgba(255,254,247,.98),rgba(255,242,211,.97))",
        boxShadow: "0 4px 0 rgba(139,84,31,.5),0 8px 18px rgba(86,52,22,.16),inset 0 3px 0 rgba(255,255,255,.9)",
      }}
    >
      <span className="pointer-events-none absolute inset-[calc(3*var(--su))] rounded-[calc(13*var(--su))] border border-white/75" />
      {hasOrder ? (
        <div className="relative flex h-full min-w-0 flex-col justify-center">
          {requirements.length === 1 ? (() => {
            const req = requirements[0];
            const def = ITEM_REGISTRY.find((i) => i.id === req.kind);
            if (!def) return null;
            const localizedName = t(`items.${req.kind}`, { defaultValue: def.name });
            return (
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center">
                  <FruitAssetImage
                    src={def.texturePath}
                    alt={localizedName}
                    className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(91,48,17,0.28)]"
                    fallback={
                      <span className="text-[calc(28*var(--su))] leading-none">
                        {def.emoji}
                      </span>
                    }
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[calc(12*var(--su))] font-black uppercase leading-none text-[#70451f] drop-shadow-[0_1px_0_#fff]">
                    {localizedName}
                  </span>
                  <span className="mt-1 block text-[calc(16*var(--su))] font-black leading-none text-[#b86f12]">
                    {req.collected}/{req.required}
                  </span>
                </span>
              </div>
            );
          })() : (
            <div className="flex h-full w-full items-center justify-around gap-1">
              {requirements.map((req) => {
                const def = ITEM_REGISTRY.find((i) => i.id === req.kind);
                if (!def) return null;
                const localizedName = t(`items.${req.kind}`, { defaultValue: def.name });
                const isComplete = req.collected >= req.required;
                return (
                  <div key={req.kind} className={`flex flex-col items-center ${isComplete ? "opacity-40 grayscale" : ""}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center">
                      <FruitAssetImage
                        src={def.texturePath}
                        alt={localizedName}
                        className="h-full w-full object-contain drop-shadow-[0_4px_3px_rgba(91,48,17,0.28)]"
                        fallback={
                          <span className="text-[calc(28*var(--su))] leading-none">
                            {def.emoji}
                          </span>
                        }
                      />
                    </span>
                    <span className="mt-1 text-[calc(16*var(--su))] font-black leading-none text-[#b86f12]">
                      {req.collected}/{req.required}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-1.5">
            <Timer
              aria-hidden="true"
              className="h-[calc(15*var(--su))] w-[calc(15*var(--su))] shrink-0 text-[#805125]"
              strokeWidth={2.3}
            />
            <div className="h-[calc(7*var(--su))] min-w-0 flex-1 overflow-hidden rounded-full border border-[#d6b27b] bg-[#e7d5b5] p-[calc(1*var(--su))] shadow-inner">
              <div
                className="h-full rounded-full transition-[width,background-color] duration-150"
                style={{
                  width: `${orderTimeProgress}%`,
                  background: `linear-gradient(180deg, ${orderTimeColor}, color-mix(in srgb, ${orderTimeColor} 78%, #5f7e12))`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)",
                }}
              />
            </div>
            <span className="min-w-[calc(24*var(--su))] text-right text-[calc(10*var(--su))] font-black text-[#70451f]">
              {formatSeconds(timeRemainingMs)}s
            </span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center text-[#95622a]">
          <span className="mb-1 text-[calc(24*var(--su))]">🛒</span>
          <span className="text-[calc(14*var(--su))] font-extrabold uppercase">
            {incomingLabel}
          </span>
        </div>
      )}
    </section>
  );
});
