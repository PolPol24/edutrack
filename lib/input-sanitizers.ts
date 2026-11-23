/** Client-side typing helpers. The API repeats validation; these are usability guardrails. */
export function lettersAndNamePunctuation(value: string): string {
  return value.replace(/[^\p{L}\p{M}\s.'’\-]/gu, "").replace(/\s{2,}/g, " ");
}

export function digitsOnly(value: string, maxLength = 32): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function decimalNumber(value: string, maxDecimals = 2): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const point = cleaned.indexOf(".");
  if (point < 0) return cleaned;
  return cleaned.slice(0, point + 1) + cleaned.slice(point + 1).replace(/\./g, "").slice(0, maxDecimals);
}

/** Phone numbers may contain formatting, but never alphabetic or arbitrary symbols. */
export function phoneNumber(value: string): string {
  return value.replace(/[^\d+()\s.-]/g, "").slice(0, 40);
}

/** Room labels allow ordinary alphanumerics, spaces, and hyphens (e.g. CL-2). */
export function roomLabel(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s-]/gu, "").slice(0, 100);
}
