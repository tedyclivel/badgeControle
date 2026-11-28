import { describe, expect, it } from 'vitest';
import { getPendingEvents } from './pending-events';

describe('Offline synchronization queue', () => {
    const events = Array.from(
        { length: 20 },
        (_, index) => ({
            localEventId: `event-${index + 1}`,
        }),
    );

    it('keeps all events when synchronization fails', () => {
        expect(getPendingEvents(events, []))
        .toHaveLength(20);
    });

    it('keeps unacknowledged events after partial sync', () => {
        const acknowledged = events
        .slice(0, 8)
        .map(event => event.localEventId);

        expect(getPendingEvents(events, acknowledged))
        .toEqual(events.slice(8));
    });

    it('clears the queue after full acknowledgment', () => {
        const acknowledged = events.map(
            event => event.localEventId,
        );

        expect(getPendingEvents(events, acknowledged))
        .toHaveLength(0);
    });

    it('ignores duplicate acknowledgments', () => {
        expect(getPendingEvents(events, [
            'event-1',
            'event-1',
        ])).toHaveLength(19);
    });

    it('does not mutate the original queue', () => {
        getPendingEvents(events, ['event-1']);

        expect(events).toHaveLength(20);
    });
});
