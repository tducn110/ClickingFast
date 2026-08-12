interface ReviveCountdownOverlayProps {
  countdown: number;
}

export function ReviveCountdownOverlay({
  countdown,
}: ReviveCountdownOverlayProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#DCECF0]/50 backdrop-blur-[2px]" style={{ zIndex: "var(--z-modal)" }}>
      <div
        className="animate-bounce text-[#EED05E] font-extrabold"
        style={{ fontSize: "120px", textShadow: "0 4px 0 rgba(238,208,94,0.3)" }}
      >
        {countdown}
      </div>
    </div>
  );
}
