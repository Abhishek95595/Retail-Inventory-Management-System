/**
 * Shared Indian Rupee (INR, ₹) Currency Utility
 *
 * Provides consistent formatting for currency values across RIMS using
 * the Indian numbering system (e.g. ₹1,25,000.00).
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrFormatterNoFractions = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export interface FormatINROptions {
  /**
   * If true, displays with currency code (e.g. "INR 1,25,000.00") instead of symbol "₹"
   */
  useCode?: boolean;
  /**
   * Value to return when amount is null, undefined, or NaN.
   * Defaults to '₹0.00' (or 'INR 0.00' if useCode is true).
   * Can pass '—' or '' if desired.
   */
  fallback?: string;
  /**
   * If true, suppresses decimals when the number is a whole integer.
   */
  compactDecimals?: boolean;
}

/**
 * Formats a numeric amount or decimal string as Indian Rupees (INR).
 * Uses Indian digit grouping: lakhs and crores (e.g., ₹1,25,000.00).
 *
 * @param amount - Number, numeric string, null, or undefined
 * @param options - Customization options
 * @returns Formatted currency string (e.g., "₹1,25,000.00")
 */
export function formatINR(
  amount: number | string | null | undefined,
  options: FormatINROptions = {}
): string {
  const { useCode = false, fallback, compactDecimals = false } = options;

  if (amount === null || amount === undefined || amount === '') {
    return fallback !== undefined ? fallback : useCode ? 'INR 0.00' : '₹0.00';
  }

  const numericValue = typeof amount === 'number' ? amount : Number(amount);

  if (Number.isNaN(numericValue)) {
    return fallback !== undefined ? fallback : useCode ? 'INR 0.00' : '₹0.00';
  }

  let formatted: string;
  if (compactDecimals && Number.isInteger(numericValue)) {
    formatted = inrFormatterNoFractions.format(numericValue);
  } else {
    formatted = inrFormatter.format(numericValue);
  }

  if (useCode) {
    // Replace the ₹ symbol and leading space with "INR "
    // Note: inrFormatter output in en-IN has "₹" immediately or with space
    formatted = formatted.replace(/^₹\s?/, 'INR ').replace(/^-₹\s?/, '-INR ');
  }

  return formatted;
}

/**
 * Returns the raw Indian number grouping string without currency symbol.
 * Example: 125000 -> "1,25,000.00"
 */
export function formatINRAmount(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00';
  }

  const numericValue = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(numericValue)) {
    return '0.00';
  }

  return numericValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
