import { useEffect, useId, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { fromMeters, toMeters, type Unit } from '../lib/units';

interface CompactNumberFieldProps {
  label: string;
  /** Value in meters (canonical store unit). For non-length fields pass `unit="raw"`. */
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Step in canonical units (meters for lengths). */
  step?: number;
  /** Display unit. 'm' = canonical meters; 'cm' / 'mm' show converted value;
   *  any other string = display-only suffix (no conversion, e.g. '°'). */
  unit?: string;
  /** When true, the displayed value follows the global unit setting (m/cm/mm). */
  followGlobalUnit?: boolean;
}

export function CompactNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.05,
  unit,
  followGlobalUnit = false,
}: CompactNumberFieldProps) {
  const globalUnit = useRoomStore((s) => s.settings.unit);
  const displayUnit: Unit | string = followGlobalUnit
    ? globalUnit
    : unit ?? 'm';
  const isLength = displayUnit === 'm' || displayUnit === 'cm' || displayUnit === 'mm';

  const present = (vMeters: number): number => {
    if (!isLength) return vMeters;
    return fromMeters(vMeters, displayUnit as Unit);
  };
  const accept = (vDisplay: number): number => {
    if (!isLength) return vDisplay;
    return toMeters(vDisplay, displayUnit as Unit);
  };
  const presentStep = (m: number) =>
    isLength ? fromMeters(m, displayUnit as Unit) : m;

  const [draft, setDraft] = useState<string>(() =>
    formatNumber(present(value), displayUnit),
  );
  const id = useId();

  useEffect(() => {
    setDraft(formatNumber(present(value), displayUnit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, displayUnit]);

  const commit = (raw: string) => {
    const num = Number(raw);
    if (Number.isNaN(num)) {
      setDraft(formatNumber(present(value), displayUnit));
      return;
    }
    let v = accept(num);
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(Number(v.toFixed(4)));
  };

  return (
    <div className="cnf">
      <label htmlFor={id} className="cnf-label">
        {label}
        {displayUnit ? <span className="cnf-unit">{displayUnit}</span> : null}
      </label>
      <input
        id={id}
        type="number"
        className="cnf-input"
        step={presentStep(step)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

function formatNumber(v: number, unit: string): string {
  if (unit === 'mm') return v.toFixed(0);
  if (unit === 'cm') return v.toFixed(1);
  return v.toFixed(2);
}
