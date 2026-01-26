import { Command } from "../commands/command";

/**
 * Common interface that all transports must implement
 */
export interface ITransport {
    /**
     * Connect to the transport
     */
    connect(): Promise<boolean>;

    /**
     * Disconnect from the transport
     */
    disconnect(): void;

    /**
     * Check if transport is currently connected
     */
    isConnected(): boolean;

    /**
     * Register callback for when frames are received
     */
    onFrame(callback: (data: Buffer) => void): void;

    /**
     * Send a command through the transport
     */
    sendCommand(command: Command): boolean;
}

/**
 * Configuration options common to all transports
 */
export interface TransportConfig {
    autoReconnect?: boolean;
    reconnectDelayMs?: number;
}
