import * as fs from "fs";
import * as path from "path";
import type {
    Config,
    ConnectionType,
    PartialConfig,
    HealthCheckConfig,
} from "./types";

const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
    enabled: true,
    intervalMs: 30000,
    staleThresholdMs: 120000,
    publishStatus: true,
};

const DEFAULTS: Partial<Config> = {
    connectionType: "serial",
    baudrate: 115200,
    tcpPort: 5000,
    mqttPort: 1883,
    mqttTopic: "meshcore",
    debug: false,
    healthCheck: DEFAULT_HEALTH_CHECK,
};

export function loadEnvConfig(): PartialConfig {
    const config: PartialConfig = {};

    if (process.env.MESHCORE_CONNECTION_TYPE) {
        const connType = process.env.MESHCORE_CONNECTION_TYPE.toLowerCase();
        if (connType === "serial" || connType === "tcp") {
            config.connectionType = connType as ConnectionType;
        }
    }
    if (process.env.MESHCORE_PORT) {
        config.port = process.env.MESHCORE_PORT;
    }
    if (process.env.MESHCORE_BAUDRATE) {
        config.baudrate = parseInt(process.env.MESHCORE_BAUDRATE, 10);
    }
    if (process.env.MESHCORE_TCP_HOST) {
        config.tcpHost = process.env.MESHCORE_TCP_HOST;
    }
    if (process.env.MESHCORE_TCP_PORT) {
        config.tcpPort = parseInt(process.env.MESHCORE_TCP_PORT, 10);
    }
    if (process.env.MESHCORE_MQTT_BROKER) {
        config.mqttBroker = process.env.MESHCORE_MQTT_BROKER;
    }
    if (process.env.MESHCORE_MQTT_PORT) {
        config.mqttPort = parseInt(process.env.MESHCORE_MQTT_PORT, 10);
    }
    if (process.env.MESHCORE_MQTT_USER) {
        config.mqttUser = process.env.MESHCORE_MQTT_USER;
    }
    if (process.env.MESHCORE_MQTT_PASS) {
        config.mqttPass = process.env.MESHCORE_MQTT_PASS;
    }
    if (process.env.MESHCORE_MQTT_TOPIC) {
        config.mqttTopic = process.env.MESHCORE_MQTT_TOPIC;
    }
    if (process.env.MESHCORE_DEBUG) {
        config.debug = process.env.MESHCORE_DEBUG === "true";
    }

    return config;
}

export function loadJsonConfig(configPath: string): PartialConfig {
    const resolvedPath = path.resolve(configPath);

    if (!fs.existsSync(resolvedPath)) {
        return {};
    }

    try {
        const content = fs.readFileSync(resolvedPath, "utf-8");
        const json = JSON.parse(content);

        const config: PartialConfig = {};

        if (
            typeof json.connectionType === "string" &&
            (json.connectionType === "serial" || json.connectionType === "tcp")
        ) {
            config.connectionType = json.connectionType as ConnectionType;
        }
        if (typeof json.port === "string") {
            config.port = json.port;
        }
        if (typeof json.baudrate === "number") {
            config.baudrate = json.baudrate;
        }
        if (typeof json.tcpHost === "string") {
            config.tcpHost = json.tcpHost;
        }
        if (typeof json.tcpPort === "number") {
            config.tcpPort = json.tcpPort;
        }
        if (typeof json.mqttBroker === "string") {
            config.mqttBroker = json.mqttBroker;
        }
        if (typeof json.mqttPort === "number") {
            config.mqttPort = json.mqttPort;
        }
        if (typeof json.mqttUser === "string") {
            config.mqttUser = json.mqttUser;
        }
        if (typeof json.mqttPass === "string") {
            config.mqttPass = json.mqttPass;
        }
        if (typeof json.mqttTopic === "string") {
            config.mqttTopic = json.mqttTopic;
        }
        if (typeof json.debug === "boolean") {
            config.debug = json.debug;
        }

        // Load health check config
        if (json.healthCheck && typeof json.healthCheck === "object") {
            config.healthCheck = {
                ...DEFAULT_HEALTH_CHECK,
                ...(typeof json.healthCheck.enabled === "boolean" && {
                    enabled: json.healthCheck.enabled,
                }),
                ...(typeof json.healthCheck.intervalMs === "number" && {
                    intervalMs: json.healthCheck.intervalMs,
                }),
                ...(typeof json.healthCheck.staleThresholdMs === "number" && {
                    staleThresholdMs: json.healthCheck.staleThresholdMs,
                }),
                ...(typeof json.healthCheck.publishStatus === "boolean" && {
                    publishStatus: json.healthCheck.publishStatus,
                }),
            };
        }

        return config;
    } catch {
        throw new Error(`Failed to parse config file: ${resolvedPath}`);
    }
}

export interface CliOptions {
    connectionType?: string;
    port?: string;
    baudrate?: string;
    tcpHost?: string;
    tcpPort?: string;
    mqttBroker?: string;
    mqttPort?: string;
    mqttUser?: string;
    mqttPass?: string;
    mqttTopic?: string;
    debug?: boolean;
    config?: string;
}

function loadCliConfig(options: CliOptions): PartialConfig {
    const config: PartialConfig = {};

    if (options.connectionType) {
        const connType = options.connectionType.toLowerCase();
        if (connType === "serial" || connType === "tcp") {
            config.connectionType = connType as ConnectionType;
        }
    }
    if (options.port) {
        config.port = options.port;
    }
    if (options.baudrate) {
        config.baudrate = parseInt(options.baudrate, 10);
    }
    if (options.tcpHost) {
        config.tcpHost = options.tcpHost;
    }
    if (options.tcpPort) {
        config.tcpPort = parseInt(options.tcpPort, 10);
    }
    if (options.mqttBroker) {
        config.mqttBroker = options.mqttBroker;
    }
    if (options.mqttPort) {
        config.mqttPort = parseInt(options.mqttPort, 10);
    }
    if (options.mqttUser) {
        config.mqttUser = options.mqttUser;
    }
    if (options.mqttPass) {
        config.mqttPass = options.mqttPass;
    }
    if (options.mqttTopic) {
        config.mqttTopic = options.mqttTopic;
    }
    if (options.debug !== undefined) {
        config.debug = options.debug;
    }

    return config;
}

function getConfigPath(cliOptions: CliOptions): string {
    if (cliOptions.config) {
        return cliOptions.config;
    }
    if (process.env.MESHCORE_CONFIG) {
        return process.env.MESHCORE_CONFIG;
    }
    return "config.json";
}

export function loadConfig(cliOptions: CliOptions): Config {
    const configPath = getConfigPath(cliOptions);

    const envConfig = loadEnvConfig();
    const jsonConfig = loadJsonConfig(configPath);
    const cliConfig = loadCliConfig(cliOptions);

    const merged = {
        ...DEFAULTS,
        ...envConfig,
        ...jsonConfig,
        ...cliConfig,
        // Ensure nested configs are properly merged with defaults
        healthCheck: {
            ...DEFAULT_HEALTH_CHECK,
            ...jsonConfig.healthCheck,
        },
    };

    if (merged.connectionType === "serial" && !merged.port) {
        console.error(
            "Error: Serial port is required for serial connection. Provide via --port, MESHCORE_PORT, or config file."
        );
        process.exit(1);
    }

    if (merged.connectionType === "tcp" && !merged.tcpHost) {
        console.error(
            "Error: TCP host is required for TCP connection. Provide via --tcp-host, MESHCORE_TCP_HOST, or config file."
        );
        process.exit(1);
    }

    if (!merged.mqttBroker) {
        console.error(
            "Error: MQTT broker is required. Provide via --mqtt-broker, MESHCORE_MQTT_BROKER, or config file."
        );
        process.exit(1);
    }

    return merged as Config;
}
