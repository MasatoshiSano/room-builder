import { TextField } from '@serendie/ui';
import { useEffect, useState } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string>(value.toString());

  useEffect(() => {
    setDraft(value.toString());
  }, [value]);

  const commit = (raw: string) => {
    const num = Number(raw);
    if (Number.isNaN(num)) {
      setDraft(value.toString());
      return;
    }
    let clamped = num;
    if (min !== undefined) clamped = Math.max(min, clamped);
    if (max !== undefined) clamped = Math.min(max, clamped);
    onChange(Number(clamped.toFixed(2)));
  };

  return (
    <TextField
      label={unit ? `${label} (${unit})` : label}
      type="number"
      step={step}
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      fullWidth
    />
  );
}
