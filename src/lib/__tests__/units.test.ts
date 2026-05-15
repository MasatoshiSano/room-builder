import { describe, expect, it } from 'vitest';
import { formatLength, fromMeters, toMeters, unitStep } from '../units';

describe('units', () => {
  it('fromMeters converts m → cm/mm', () => {
    expect(fromMeters(1.5, 'm')).toBe(1.5);
    expect(fromMeters(1.5, 'cm')).toBe(150);
    expect(fromMeters(1.5, 'mm')).toBe(1500);
  });

  it('toMeters round-trips', () => {
    expect(toMeters(150, 'cm')).toBe(1.5);
    expect(toMeters(1500, 'mm')).toBe(1.5);
    expect(toMeters(1.5, 'm')).toBe(1.5);
  });

  it('formatLength uses appropriate precision per unit', () => {
    expect(formatLength(1.234, 'm')).toBe('1.23m');
    expect(formatLength(1.234, 'cm')).toBe('123.40cm');
    expect(formatLength(1.234, 'mm')).toBe('1234mm');
  });

  it('unitStep scales the base meter step into display units', () => {
    expect(unitStep('m', 0.05)).toBeCloseTo(0.05);
    expect(unitStep('cm', 0.05)).toBeCloseTo(5);
    expect(unitStep('mm', 0.05)).toBeCloseTo(50);
  });
});
