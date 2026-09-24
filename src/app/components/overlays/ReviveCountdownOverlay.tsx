interface CountdownOverlayProps {
  countdown: number;
}

export function CountdownOverlay({
  countdown,
}: CountdownOverlayProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[#DCECF0]/50 backdrop-blur-[2px] pointer-events-none select-none"
      style={{ zIndex: "var(--z-modal)" }}
      aria-live="assertive"
    >
      <div
        key={countdown}
        className="animate-bounce text-[#EED05E] font-black"
        style={{
          fontSize: "clamp(80px, 22vw, 150px)",
          textShadow: "0 6px 0 rgba(204, 112, 105, 0.4), 0 12px 28px rgba(74, 77, 78, 0.25)",
        }}
      >
        {countdown}
      </div>
    </div>
  );
}

export const ReviveCountdownOverlay = CountdownOverlay;

