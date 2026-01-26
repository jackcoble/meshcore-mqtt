import * as mqtt from "mqtt";
import program from "./cli";
import { loadConfig } from "./config";
import { MeshCoreBridge } from "./bridge";
import { pino } from "pino";
import { SerialTransport } from "./transports/serial.transport";
import { TcpTransport } from "./transports/tcp.transport";
import type { ITransport } from "./transports/transport";

(async () => {
    const cliOptions = program.opts();
    const config = loadConfig(cliOptions);

    const logger = pino({
        level: config.debug ? "debug" : "info",
    });

    const mqttUrl = `mqtt://${config.mqttBroker}:${config.mqttPort}`;
    const mqttOptions: mqtt.IClientOptions = {
        clientId: "meshcore_bridge",
    };

    if (config.mqttUser && config.mqttPass) {
        mqttOptions.username = config.mqttUser;
        mqttOptions.password = config.mqttPass;
    }

    logger.info(`Connecting to MQTT broker at ${mqttUrl}`);
    const mqttClient = mqtt.connect(mqttUrl, mqttOptions);

    mqttClient.on("connect", () => {
        logger.info("Connected to MQTT broker");
    });

    mqttClient.on("error", (err) => {
        logger.error(`MQTT error: ${err.message}`);
    });

    let transport: ITransport;

    if (config.connectionType === "tcp") {
        logger.info(
            `Using TCP connection to ${config.tcpHost}:${config.tcpPort}`
        );
        transport = new TcpTransport(
            {
                host: config.tcpHost,
                port: config.tcpPort,
                autoReconnect: true,
                reconnectDelayMs: 5000,
            },
            logger
        );
    } else {
        logger.info(
            `Using serial connection on ${config.port} at ${config.baudrate} baud`
        );
        transport = new SerialTransport(
            {
                portPath: config.port,
                baudRate: config.baudrate,
                autoReconnect: true,
                reconnectDelayMs: 5000,
            },
            logger
        );
    }

    const connected = await transport.connect();
    if (!connected) {
        logger.error("Failed to connect to transport");
        process.exit(1);
    }

    const bridge = new MeshCoreBridge(transport, mqttClient, logger);

    bridge.start();

    // Graceful shutdown handler
    const shutdown = () => {
        logger.info("Shutting down...");
        bridge.stop();
        transport.disconnect();
        mqttClient.end();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
})();
