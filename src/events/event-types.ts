/**
 * Event types for categorizing messages in the bi-directional bridge.
 * These provide a unified way to identify the source and nature of events.
 */
export enum EventType {
    /**
     * Events originating from the MeshCore radio.
     * Includes channel messages, text messages, contacts, and device responses.
     */
    MESHCORE_EVENT = "MESHCORE_EVENT",

    /**
     * Commands received from MQTT to be sent to the radio.
     * Includes text_message and channel_message commands.
     */
    MQTT_COMMAND = "MQTT_COMMAND",

    /**
     * Internal status updates from the bridge.
     * Includes queue status, connection state changes, and processing updates.
     */
    STATUS_UPDATE = "STATUS_UPDATE",

    /**
     * Health check events.
     * Periodic health status checks and connectivity monitoring.
     */
    HEALTH_CHECK = "HEALTH_CHECK",
}

/**
 * Event metadata attached to logged events.
 */
export interface EventMetadata {
    type: EventType;
    timestamp: number;
    source?: string;
    details?: Record<string, unknown>;
}

/**
 * Create event metadata for logging.
 */
export function createEventMetadata(
    type: EventType,
    source?: string,
    details?: Record<string, unknown>
): EventMetadata {
    return {
        type,
        timestamp: Date.now(),
        source,
        details,
    };
}
