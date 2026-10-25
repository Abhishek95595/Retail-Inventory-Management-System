import { describe, it, expect } from 'vitest';

/**
 * Fundamental RIMS Inventory Calculation Logic Unit Tests.
 *
 * Verifies core inventory arithmetic defined in the RIMS SRS:
 * Formula: Available = On-Hand - Reserved - Quarantined
 */
export function calculateAvailableStock(params: {
  onHand: number;
  reserved: number;
  quarantined: number;
}): number {
  const available = params.onHand - params.reserved - params.quarantined;
  return Math.max(0, available);
}

export function isReorderNeeded(params: { available: number; reorderPoint: number }): boolean {
  return params.available <= params.reorderPoint;
}

describe('RIMS Core Inventory Calculations (Unit Test Suite)', () => {
  it('correctly calculates available inventory balance given on-hand, reserved, and quarantined units', () => {
    const balance = calculateAvailableStock({
      onHand: 150,
      reserved: 30,
      quarantined: 10,
    });
    expect(balance).toBe(110);
  });

  it('prevents negative available stock when reservations exceed on-hand quantities', () => {
    const balance = calculateAvailableStock({
      onHand: 10,
      reserved: 25,
      quarantined: 0,
    });
    expect(balance).toBe(0);
  });

  it('identifies when available stock breaches reorder threshold', () => {
    const shouldReorder = isReorderNeeded({
      available: 15,
      reorderPoint: 20,
    });
    expect(shouldReorder).toBe(true);
  });

  it('identifies when available stock remains safely above reorder threshold', () => {
    const shouldReorder = isReorderNeeded({
      available: 45,
      reorderPoint: 20,
    });
    expect(shouldReorder).toBe(false);
  });
});
