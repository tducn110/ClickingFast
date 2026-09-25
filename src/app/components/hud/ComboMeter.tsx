import { memo } from "react";

export interface ComboMeterProps {
  combo: number;
  active: boolean;
  progress: number;
  revision: number;
  label: string;
}

export function ComboMeter({
  combo,
  active,
  progress,
  revision,
  label,
}: ComboMeterProps) {
  return (
    <div className="comboMeter" data-active={active ? "true" : "false"}>
      <div className="comboMeterTop">
        <span>{label}</span>
        <strong>{combo}</strong>
      </div>
      <div className="comboMeterTrack" aria-hidden="true">
        <span
          key={revision}
          className="comboMeterFill"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}

export const ComboMeterMemo = memo(ComboMeter);
