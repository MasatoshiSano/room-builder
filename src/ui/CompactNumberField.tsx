import { useEffect, useId, useState } from 'react';

interface CompactNumberFieldProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function CompactNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
}: CompactNumberFieldProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const id = useId();

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const num = Number(raw);
    if (Number.isNaN(num)) {
      setDraft(String(value));
      return;
    }
    let v = num;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(Number(v.toFixed(2)));
  };

  return (
    <div className="cnf">
      <label htmlFor={id} className="cnf-label">
        {label}
        {unit ? <span className="cnf-unit">{unit}</span> : null}
      </label>
      <input
        id={id}
        type="number"
        className="cnf-input"
        step={step}
        min={min}
        max={max}
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
