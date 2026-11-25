const DUPLICATE_WINDOW_MS = 60_000;

export function isWithinDuplicateWindow(
    firstScanMs: number,
    secondScanMs: number,
): boolean {
    return Math.abs(firstScanMs - secondScanMs)
    < DUPLICATE_WINDOW_MS;
}
