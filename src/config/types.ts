// Supported connection types are Serial and TCP
export type ConnectionType = "serial" | "tcp";

// Health check configuration for monitoring MeshCore connection
export interface HealthCheckConfig {
    enabled: boolean;
    intervalMs: number;
    staleThresholdMs: number;
    publishStatus: boolean;
}

// Main configuration interface for the MeshCore-MQTT bridge
export interface Config {
    connectionType: ConnectionType;

    // Serial connection settings
    port: string;
    baudrate: number;

    // TCP connection settings
    tcpHost: string;
    tcpPort: number;

    // MQTT settings
    mqttBroker: string;
    mqttPort: number;
    mqttUser?: string;
    mqttPass?: string;
    mqttTopic: string;
    debug: boolean;

    // Health check settings
    healthCheck: HealthCheckConfig;
}

// Partial configuration type for overrides or defaults
export type PartialConfig = Partial<Config>;
