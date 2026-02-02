import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
    loadEnvConfig,
    loadJsonConfig,
    loadConfig,
} from "../../src/config/loader";
import type { CliOptions } from "../../src/config/loader";

describe("Config Loader", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("loadEnvConfig", () => {
        it("should return empty config when no env vars set", () => {
            const config = loadEnvConfig();
            expect(config).toEqual({});
        });

        it("should load serial connection type from env", () => {
            process.env.MESHCORE_CONNECTION_TYPE = "serial";
            const config = loadEnvConfig();
            expect(config.connectionType).toBe("serial");
        });

        it("should load tcp connection type from env", () => {
            process.env.MESHCORE_CONNECTION_TYPE = "TCP";
            const config = loadEnvConfig();
            expect(config.connectionType).toBe("tcp");
        });

        it("should ignore invalid connection type", () => {
            process.env.MESHCORE_CONNECTION_TYPE = "invalid";
            const config = loadEnvConfig();
            expect(config.connectionType).toBeUndefined();
        });

        it("should load port from env", () => {
            process.env.MESHCORE_PORT = "/dev/ttyUSB0";
            const config = loadEnvConfig();
            expect(config.port).toBe("/dev/ttyUSB0");
        });

        it("should load numeric values from env", () => {
            process.env.MESHCORE_BAUDRATE = "9600";
            process.env.MESHCORE_TCP_PORT = "5000";
            process.env.MESHCORE_MQTT_PORT = "1883";
            const config = loadEnvConfig();
            expect(config.baudrate).toBe(9600);
            expect(config.tcpPort).toBe(5000);
            expect(config.mqttPort).toBe(1883);
        });

        it("should load string values from env", () => {
            process.env.MESHCORE_TCP_HOST = "192.168.1.1";
            process.env.MESHCORE_MQTT_BROKER = "mqtt://broker";
            process.env.MESHCORE_MQTT_USER = "user";
            process.env.MESHCORE_MQTT_PASS = "pass";
            process.env.MESHCORE_MQTT_TOPIC = "test/topic";
            const config = loadEnvConfig();
            expect(config.tcpHost).toBe("192.168.1.1");
            expect(config.mqttBroker).toBe("mqtt://broker");
            expect(config.mqttUser).toBe("user");
            expect(config.mqttPass).toBe("pass");
            expect(config.mqttTopic).toBe("test/topic");
        });

        it("should load debug flag from env", () => {
            process.env.MESHCORE_DEBUG = "true";
            const config = loadEnvConfig();
            expect(config.debug).toBe(true);
        });

        it("should treat non-true debug values as false", () => {
            process.env.MESHCORE_DEBUG = "false";
            const config = loadEnvConfig();
            expect(config.debug).toBe(false);
        });
    });

    describe("loadJsonConfig", () => {
        const testConfigPath = path.join(__dirname, "test-config.json");

        afterEach(() => {
            if (fs.existsSync(testConfigPath)) {
                fs.unlinkSync(testConfigPath);
            }
        });

        it("should return empty config for non-existent file", () => {
            const config = loadJsonConfig("/nonexistent/path.json");
            expect(config).toEqual({});
        });

        it("should load valid JSON config", () => {
            const testConfig = {
                connectionType: "serial",
                port: "/dev/ttyUSB0",
                baudrate: 115200,
                mqttBroker: "mqtt://broker",
                mqttTopic: "test",
                debug: true,
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

            const config = loadJsonConfig(testConfigPath);
            expect(config.connectionType).toBe("serial");
            expect(config.port).toBe("/dev/ttyUSB0");
            expect(config.baudrate).toBe(115200);
            expect(config.mqttBroker).toBe("mqtt://broker");
            expect(config.mqttTopic).toBe("test");
            expect(config.debug).toBe(true);
        });

        it("should load TCP config from JSON", () => {
            const testConfig = {
                connectionType: "tcp",
                tcpHost: "192.168.1.1",
                tcpPort: 5000,
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

            const config = loadJsonConfig(testConfigPath);
            expect(config.connectionType).toBe("tcp");
            expect(config.tcpHost).toBe("192.168.1.1");
            expect(config.tcpPort).toBe(5000);
        });

        it("should load health check config from JSON", () => {
            const testConfig = {
                healthCheck: {
                    enabled: false,
                    intervalMs: 60000,
                    staleThresholdMs: 180000,
                    publishStatus: false,
                },
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

            const config = loadJsonConfig(testConfigPath);
            expect(config.healthCheck?.enabled).toBe(false);
            expect(config.healthCheck?.intervalMs).toBe(60000);
            expect(config.healthCheck?.staleThresholdMs).toBe(180000);
            expect(config.healthCheck?.publishStatus).toBe(false);
        });

        it("should merge partial health check config with defaults", () => {
            const testConfig = {
                healthCheck: {
                    intervalMs: 45000,
                },
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

            const config = loadJsonConfig(testConfigPath);
            expect(config.healthCheck?.enabled).toBe(true); // default
            expect(config.healthCheck?.intervalMs).toBe(45000); // custom
            expect(config.healthCheck?.staleThresholdMs).toBe(120000); // default
        });

        it("should ignore invalid types in JSON", () => {
            const testConfig = {
                connectionType: 123, // invalid
                port: true, // invalid
                baudrate: "not a number", // invalid
                debug: "yes", // invalid
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

            const config = loadJsonConfig(testConfigPath);
            expect(config.connectionType).toBeUndefined();
            expect(config.port).toBeUndefined();
            expect(config.baudrate).toBeUndefined();
            expect(config.debug).toBeUndefined();
        });

        it("should throw on invalid JSON", () => {
            fs.writeFileSync(testConfigPath, "{ invalid json }");
            expect(() => loadJsonConfig(testConfigPath)).toThrow(
                "Failed to parse config file"
            );
        });
    });

    describe("loadConfig", () => {
        const testConfigPath = path.join(__dirname, "test-config.json");
        const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit");
        });
        const mockConsoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        afterEach(() => {
            if (fs.existsSync(testConfigPath)) {
                fs.unlinkSync(testConfigPath);
            }
            mockExit.mockClear();
            mockConsoleError.mockClear();
        });

        it("should merge configs with correct priority", () => {
            const jsonConfig = {
                connectionType: "serial" as const,
                port: "/dev/ttyUSB0",
                baudrate: 9600,
                mqttBroker: "mqtt://json-broker",
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(jsonConfig));

            process.env.MESHCORE_BAUDRATE = "115200";
            process.env.MESHCORE_MQTT_TOPIC = "env-topic";

            const cliOptions: CliOptions = {
                config: testConfigPath,
                mqttBroker: "mqtt://cli-broker",
            };

            const config = loadConfig(cliOptions);

            // CLI takes highest priority
            expect(config.mqttBroker).toBe("mqtt://cli-broker");
            // JSON takes priority over env
            expect(config.baudrate).toBe(9600);
            expect(config.mqttTopic).toBe("env-topic");
            // JSON used where others don't override
            expect(config.port).toBe("/dev/ttyUSB0");
        });

        it("should use defaults when nothing provided", () => {
            const jsonConfig = {
                connectionType: "serial" as const,
                port: "/dev/ttyUSB0",
                mqttBroker: "mqtt://broker",
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(jsonConfig));

            const config = loadConfig({ config: testConfigPath });

            expect(config.baudrate).toBe(115200); // default
            expect(config.mqttPort).toBe(1883); // default
            expect(config.mqttTopic).toBe("meshcore"); // default
            expect(config.debug).toBe(false); // default
        });

        it("should exit if serial port is missing for serial connection", () => {
            const jsonConfig = {
                connectionType: "serial" as const,
                mqttBroker: "mqtt://broker",
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(jsonConfig));

            expect(() => loadConfig({ config: testConfigPath })).toThrow(
                "process.exit"
            );
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("Serial port is required")
            );
        });

        it("should exit if TCP host is missing for TCP connection", () => {
            const jsonConfig = {
                connectionType: "tcp" as const,
                mqttBroker: "mqtt://broker",
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(jsonConfig));

            expect(() => loadConfig({ config: testConfigPath })).toThrow(
                "process.exit"
            );
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("TCP host is required")
            );
        });

        it("should exit if MQTT broker is missing", () => {
            const jsonConfig = {
                connectionType: "serial" as const,
                port: "/dev/ttyUSB0",
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(jsonConfig));

            expect(() => loadConfig({ config: testConfigPath })).toThrow(
                "process.exit"
            );
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("MQTT broker is required")
            );
        });

        it("should use default config.json path if not specified", () => {
            const config = loadConfig({
                connectionType: "serial",
                port: "/dev/ttyUSB0",
                mqttBroker: "mqtt://broker",
            });
            expect(config).toBeDefined();
        });

        it("should use MESHCORE_CONFIG env var for config path", () => {
            process.env.MESHCORE_CONFIG = testConfigPath;
            const jsonConfig = {
                connectionType: "serial" as const,
                port: "/dev/ttyUSB0",
                mqttBroker: "mqtt://broker",
                mqttTopic: "from-env-path",
            };
            fs.writeFileSync(testConfigPath, JSON.stringify(jsonConfig));

            const config = loadConfig({});
            expect(config.mqttTopic).toBe("from-env-path");
        });
    });
});
