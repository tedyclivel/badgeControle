export interface PendingEvent {
    readonly localEventId: string;
}

export function getPendingEvents<T extends PendingEvent>(
    events: readonly T[],
    acknowledgedIds: readonly string[],
): T[] {
    const acknowledged = new Set(acknowledgedIds);

    return events.filter(
        event => !acknowledged.has(event.localEventId),
    );
}
