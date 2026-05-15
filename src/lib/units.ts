export type Unit = 'm' | 'cm' | 'mm';

export function fromMeters(m: number, unit: Unit): number {
  switch (unit) {
    case 'cm':
      return m * 100;
    case 'mm':
      return m * 1000;
    default:
      return m;
  }
}

export function toMeters(v: number, unit: Unit): number {
  switch (unit) {
    case 'cm':
      return v / 100;
    case 'mm':
      return v / 1000;
    default:
      return v;
  }
}

export function formatLength(m: number, unit: Unit, digits = 2): string {
  const v = fromMeters(m, unit);
  const d = unit === 'mm' ? 0 : digits;
  return `${v.toFixed(d)}${unit}`;
}

export function unitStep(unit: Unit, baseStepMeters = 0.05): number {
  switch (unit) {
    case 'cm':
      return baseStepMeters * 100;
    case 'mm':
      return baseStepMeters * 1000;
    default:
      return baseStepMeters;
  }
}
