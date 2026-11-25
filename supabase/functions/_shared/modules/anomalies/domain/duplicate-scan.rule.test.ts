import { equal } from 'node:assert/strict';
import { isWithinDuplicateWindow } from './duplicate-scan.rule.ts';

Deno.test('Detects scans separated by 30 seconds', () => {
    equal(isWithinDuplicateWindow(0, 30_000), true);
});

Deno.test('Detects scans just below 60 seconds', () => {
    equal(isWithinDuplicateWindow(0, 59_999), true);
});

Deno.test('Accepts scans separated by exactly 60 seconds', () => {
    equal(isWithinDuplicateWindow(0, 60_000), false);
});

Deno.test('Accepts scans separated by more than 60 seconds', () => {
    equal(isWithinDuplicateWindow(0, 90_000), false);
});

Deno.test('Handles out-of-order synchronization', () => {
    equal(isWithinDuplicateWindow(30_000, 0), true);
});
