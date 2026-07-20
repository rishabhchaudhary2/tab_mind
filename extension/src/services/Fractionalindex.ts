// fractionalIndex.ts
//
// Generates a sortable string key that sits between two existing keys,
// without ever needing to rewrite sibling rows. Used for `position_key`
// on custom_folders and folder_tabs.
//
// Keys are base36 strings. To insert between "a" and "b", we find the
// midpoint character-by-character. Passing null for `before`/`after`
// means "insert at the very start/end".

const BASE = 36;
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

function charToInt(c: string): number {
  return DIGITS.indexOf(c);
}

function intToChar(n: number): string {
  return DIGITS[n];
}

/**
 * Returns a key that sorts strictly between `before` and `after`.
 * - generateKeyBetween(null, null) -> first key ever ("m", roughly the midpoint)
 * - generateKeyBetween(null, "m")  -> key before "m"
 * - generateKeyBetween("m", null)  -> key after "m"
 * - generateKeyBetween("a", "b")   -> key between "a" and "b"
 */
export function generateKeyBetween(before: string | null, after: string | null): string {
  if (before === null && after === null) return "m"; // midpoint of base36
  if (before === null) return generateBefore(after!);
  if (after === null) return generateAfter(before);
  return generateMidpoint(before, after);
}

function generateAfter(key: string): string {
  // Append a midpoint character; simplest strategy that always sorts after.
  return key + "m";
}

function generateBefore(key: string): string {
  const first = charToInt(key[0] ?? "m");
  if (first > 0) {
    return intToChar(Math.floor(first / 2)) + key.slice(1);
  }
  // key starts with "0" — go one level deeper
  return "0" + generateBefore(key.slice(1) || "m");
}

function generateMidpoint(a: string, b: string): string {
  if (a >= b) {
    throw new Error(`generateMidpoint requires a < b, got "${a}" >= "${b}"`);
  }
  let result = "";
  let i = 0;
  while (true) {
    const ca = i < a.length ? charToInt(a[i]) : 0;
    const cb = i < b.length ? charToInt(b[i]) : BASE;
    if (cb - ca > 1) {
      result += intToChar(ca + Math.floor((cb - ca) / 2));
      return result;
    }
    // digits adjacent or equal — carry this digit and go deeper
    result += intToChar(ca);
    i++;
    if (i > 50) return result + "m"; // safety valve, should never hit in practice
  }
}

/**
 * Given the currently-ordered list of sibling position_keys and a target
 * index to drop an item at, returns the new key for that item.
 */
export function keyForIndex(siblingKeysInOrder: string[], targetIndex: number): string {
  const before = targetIndex > 0 ? siblingKeysInOrder[targetIndex - 1] : null;
  const after = targetIndex < siblingKeysInOrder.length ? siblingKeysInOrder[targetIndex] : null;
  return generateKeyBetween(before, after);
}