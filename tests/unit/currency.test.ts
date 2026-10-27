import { describe, expect, it } from 'vitest';
import { formatINR, formatINRAmount } from '@/shared/currency';

describe('formatINR utility', () => {
  it('formats zero correctly', () => {
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR('0')).toBe('₹0.00');
    expect(formatINR('0.00')).toBe('₹0.00');
  });

  it('formats standard decimal amounts', () => {
    expect(formatINR(49.99)).toBe('₹49.99');
    expect(formatINR('89.99')).toBe('₹89.99');
    expect(formatINR(12.5)).toBe('₹12.50');
  });

  it('formats thousands and lakhs with Indian number grouping', () => {
    expect(formatINR(1000)).toBe('₹1,000.00');
    expect(formatINR(125000)).toBe('₹1,25,000.00');
    expect(formatINR('125000.5')).toBe('₹1,25,000.50');
  });

  it('formats crores and very large numbers correctly', () => {
    expect(formatINR(10000000)).toBe('₹1,00,00,000.00');
    expect(formatINR('52450000.75')).toBe('₹5,24,50,000.75');
  });

  it('formats negative amounts correctly', () => {
    expect(formatINR(-500)).toBe('-₹500.00');
    expect(formatINR('-125000.50')).toBe('-₹1,25,000.50');
  });

  it('handles null, undefined, and empty string', () => {
    expect(formatINR(null)).toBe('₹0.00');
    expect(formatINR(undefined)).toBe('₹0.00');
    expect(formatINR('')).toBe('₹0.00');
    expect(formatINR('invalid-number')).toBe('₹0.00');
  });

  it('supports custom fallback value for missing or invalid inputs', () => {
    expect(formatINR(null, { fallback: '—' })).toBe('—');
    expect(formatINR(undefined, { fallback: 'N/A' })).toBe('N/A');
    expect(formatINR('invalid', { fallback: '—' })).toBe('—');
  });

  it('supports useCode option for ISO currency code display', () => {
    expect(formatINR(125000, { useCode: true })).toBe('INR 1,25,000.00');
    expect(formatINR(-500, { useCode: true })).toBe('-INR 500.00');
    expect(formatINR(null, { useCode: true })).toBe('INR 0.00');
  });

  it('supports compactDecimals option for integers', () => {
    expect(formatINR(125000, { compactDecimals: true })).toBe('₹1,25,000');
    expect(formatINR(125000.5, { compactDecimals: true })).toBe('₹1,25,000.50');
  });
});

describe('formatINRAmount utility', () => {
  it('formats raw numbers without currency symbol', () => {
    expect(formatINRAmount(125000)).toBe('1,25,000.00');
    expect(formatINRAmount('10000000')).toBe('1,00,00,000.00');
  });

  it('supports custom decimal precision', () => {
    expect(formatINRAmount(125000.4567, 4)).toBe('1,25,000.4567');
    expect(formatINRAmount(125000.4, 4)).toBe('1,25,000.4000');
  });
});

describe('Financial rounding and decimal consistency', () => {
  it('correctly rounds sub-paisa fractional monetary amounts', () => {
    // Standard half-up or half-even rounding verification in Intl
    expect(formatINR(10.005)).toBe('₹10.01');
    expect(formatINR(10.004)).toBe('₹10.00');
    expect(formatINR('99.999')).toBe('₹100.00');
    expect(formatINR('0.001')).toBe('₹0.00');
  });

  it('verifies multiplication of fractional unit price and quantity agreement with order totals', () => {
    // 3 items with fractional values:
    // Item 1: 3.5 units @ 45.2500 = 158.3750 -> rounded display ₹158.38
    // Item 2: 12 units @ 89.9900 = 1079.8800 -> rounded display ₹1,079.88
    // Total subtotal = 1238.2550 -> rounded display ₹1,238.26
    const item1Qty = 3.5;
    const item1Price = 45.25;
    const item1Total = (item1Qty * item1Price).toFixed(4); // 158.3750

    const item2Qty = 12;
    const item2Price = 89.99;
    const item2Total = (item2Qty * item2Price).toFixed(4); // 1079.8800

    const orderSubtotal = (Number(item1Total) + Number(item2Total)).toFixed(4); // 1238.2550

    expect(formatINR(item1Total)).toBe('₹158.38');
    expect(formatINR(item2Total)).toBe('₹1,079.88');
    expect(formatINR(orderSubtotal)).toBe('₹1,238.26');
  });

  it('safely handles extremely large crore amounts without floating-point overflow', () => {
    // 50,000 units @ ₹25,000.00 = ₹1,25,00,00,000.00 (125 Crore)
    const qty = 50000;
    const unitPrice = 25000.0;
    const totalValuation = (qty * unitPrice).toFixed(2);

    expect(formatINR(totalValuation)).toBe('₹1,25,00,00,000.00');
    expect(formatINR(totalValuation, { useCode: true })).toBe('INR 1,25,00,00,000.00');
  });
});
