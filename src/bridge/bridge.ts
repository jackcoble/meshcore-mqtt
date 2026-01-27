import mqtt from "mqtt";
import { ITransport } from "../transports/transport";
import { Logger } from "pino";
import {
    AppStartCommand,
    DeviceQueryCommand,
    GetBatteryAndStorageCommand,
    ResponseCode,
    SyncNextMessageCommand,
} from "../commands";
import { PushCode } from "../constants";
import { Config } from "../config";
import { createCommandFromMessage } from "./handler";

interface QueuedCommand {
    command: any;
    retries?: number;
}

/**
 * Bridge between MeshCore serial interface and MQTT.
 * Handles receiving messages from MeshCore and publishing them to MQTT topics.
 */
export class MeshCoreBridge {
    private running = false;
    private appStartReceived = false;
    private deviceInfoReceived = false;
    private syncingMessages = false;

    private commandQueue: QueuedCommand[] = [];
    private processingQueue = false;

    constructor(
        private transport: ITransport,
        private config: Config,
        private mqttClient: mqtt.MqttClient,
        private logger: Logger
    ) {
        this.transport.onFrame((data) => this.handleFrame(data));
    }

    /**
     * Start the bridge and set up MQTT subscriptions
     */
    start(): void {
        if (this.running) return;
        this.running = true;

        this.logger.info("MeshCore to MQTT Bridge started");
        this.setupMqttSubscriptions();
        this.sendAppStart();
    }

    /**
     * Stop the bridge and clean up MQTT
     */
    stop(): void {
        if (!this.running) return;
        this.running = false;

        this.mqttClient.removeAllListeners("message");
        this.mqttClient.unsubscribe(`${this.config.mqttTopic}/command`, () => {
            this.mqttClient.end();
        });

        this.logger.info("MeshCore to MQTT Bridge stopped");
    }

    /**
     * Set up MQTT subscription for commands
     */
    private setupMqttSubscriptions(): void {
        const commandTopic = `${this.config.mqttTopic}/command`;

        this.mqttClient.subscribe(commandTopic, { qos: 1 }, (err) => {
            if (err) {
                this.logger.error(
                    { err, topic: commandTopic },
                    "Failed to subscribe to command topic"
                );
            } else {
                this.logger.info(
                    { topic: commandTopic },
                    "Subscribed to command topic"
                );
            }
        });

        this.mqttClient.on("message", (topic, message) => {
            if (topic === commandTopic) {
                this.handleIncomingCommand(message);
            }
        });
    }

    /**
     * Handle incoming command from MQTT
     * It should be validated and added to the queue
     */
    private handleIncomingCommand(message: Buffer): void {
        try {
            const json = JSON.parse(message.toString());
            this.logger.debug({ json }, "Received command from MQTT");

            const command = createCommandFromMessage(json);
            this.enqueueCommand(command);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : String(err);
            this.logger.error(
                { err, message: message.toString() },
                "Failed to process incoming command"
            );
            this.publishError({ success: false, error: errorMessage });
        }
    }

    /**
     * Queue command for rate-limited sending
     */
    private enqueueCommand(command: any) {
        this.commandQueue.push({ command, retries: 0 });

        if (!this.processingQueue) {
            this.processCommandQueue();
        }
    }

    /**
     * Process queued commands with a small delay and retries
     */
    private async processCommandQueue(): Promise<void> {
        this.processingQueue = true;

        this.logger.info(`Command queue length: ${this.commandQueue.length}`);

        while (this.commandQueue.length > 0) {
            const item = this.commandQueue.shift();
            if (!item.retries) {
                item.retries = 0;
            }

            try {
                this.transport.sendCommand(item.command);
            } catch (err) {
                item.retries++;

                if (item.retries <= 5) {
                    const delay = 1000 * 2 ** item.retries; // exponential backoff (milliseconds)

                    this.logger.warn(
                        { err, retries: item.retries },
                        `Retrying command in ${delay}ms`
                    );

                    await this.delay(delay);
                    this.commandQueue.unshift(item);
                } else {
                    this.logger.error(
                        { err },
                        "Command failed after max retries"
                    );
                }
            }

            // Fixed 1s delay between commands to avoid flooding MeshCore radio
            await this.delay(1000);
        }

        this.processingQueue = false;
    }

    /**
     * Waits for a given number of milliseconds
     * @param ms
     * @returns
     */
    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Handle frames from MeshCore
     */
    private handleFrame(data: Buffer): void {
        this.logger.debug(
            `Received frame: ${data.length} bytes, code: 0x${data[0].toString(16)}`
        );

        let topic: string | null = null;
        let payload: any = null;

        switch (data[0]) {
            case ResponseCode.SELF_INFO:
                try {
                    const info = new AppStartCommand().fromBuffer(data);
                    this.appStartReceived = true;
                    topic = `${this.config.mqttTopic}/self_info`;
                    payload = info;

                    if (!this.deviceInfoReceived) this.sendDeviceQuery();
                } catch (err) {
                    this.logger.error({ err }, "Failed to parse SELF_INFO");
                }
                break;

            case ResponseCode.DEVICE_INFO:
                try {
                    const deviceInfo = new DeviceQueryCommand().fromBuffer(
                        data
                    );
                    this.deviceInfoReceived = true;
                    topic = `${this.config.mqttTopic}/device_info`;
                    payload = deviceInfo;

                    this.startMessageSync();
                } catch (err) {
                    this.logger.error({ err }, "Failed to parse DEVICE_INFO");
                }
                break;

            case ResponseCode.CONTACT_MSG_RECV:
            case ResponseCode.CHANNEL_MSG_RECV:
            case ResponseCode.CONTACT_MSG_RECV_V3:
            case ResponseCode.CHANNEL_MSG_RECV_V3:
                const message = new SyncNextMessageCommand();
                const messageData: any = message.fromBuffer(data);

                if (message.isChannelMessage()) {
                    topic = `${this.config.mqttTopic}/message/channel/${messageData.channel_idx}`;
                } else if (message.isDirectMessage()) {
                    topic = `${this.config.mqttTopic}/message/direct/${messageData.pubkey_prefix}`;
                }

                payload = messageData;

                if (this.syncingMessages) {
                    this.sendSyncNextMessage();
                }

                break;

            case ResponseCode.NO_MORE_MESSAGES:
                this.syncingMessages = false;
                this.logger.info("Message sync completed");
                break;

            case ResponseCode.BATT_AND_STORAGE:
                payload = new GetBatteryAndStorageCommand().fromBuffer(data);
                topic = `${this.config.mqttTopic}/battery_and_storage`;
                break;

            case PushCode.MSG_WAITING:
                this.logger.info("Received MSG_WAITING. Starting message sync");
                this.startMessageSync();
                break;

            default:
                this.logger.warn(
                    `Unknown response code: 0x${data[0].toString(16)}`
                );
        }

        if (topic && payload) {
            this.publishToMqtt(topic, payload);
        }
    }

    /**
     * Publishes a payload to a MQTT topic
     * @param topic
     * @param payload
     */
    private publishToMqtt(topic: string, payload: any) {
        const strPayload = JSON.stringify(payload);

        // Publish to specific topic
        this.mqttClient.publish(topic, strPayload, { qos: 1 }, (err) => {
            if (err)
                this.logger.error({ err, topic }, "Failed to publish to MQTT");
        });

        // Publish to /all
        this.mqttClient.publish(
            `${this.config.mqttTopic}/all`,
            strPayload,
            { qos: 1 },
            (err) => {
                if (err)
                    this.logger.error(
                        { err },
                        "Failed to publish to /all topic"
                    );
            }
        );
    }

    /**
     * Publish errors to the "all" topic
     * @param error
     */
    private publishError(error: any) {
        this.mqttClient.publish(
            `${this.config.mqttTopic}/all`,
            JSON.stringify(error),
            { qos: 1 },
            (err) => {
                if (err)
                    this.logger.error(
                        { err },
                        "Failed to publish error to /all topic"
                    );
            }
        );
    }

    /**
     * MeshCore commands
     */
    private sendAppStart() {
        this.logger.info("Sending AppStart command to MeshCore");
        this.transport.sendCommand(new AppStartCommand());
    }

    private sendDeviceQuery() {
        this.logger.info("Sending DeviceQuery command to MeshCore");
        this.transport.sendCommand(new DeviceQueryCommand());
    }

    private sendSyncNextMessage() {
        this.logger.info("Sending SyncNextMessage command to MeshCore");
        this.transport.sendCommand(new SyncNextMessageCommand());
    }

    private startMessageSync() {
        if (this.syncingMessages) return;

        this.logger.info("Starting message sync");
        this.syncingMessages = true;

        // Add a safety timeout to prevent sync from getting stuck
        setTimeout(() => {
            if (this.syncingMessages) {
                this.logger.warn("Message sync timeout, resetting sync state");
                this.syncingMessages = false;
            }
        }, 30000); // 30s timeout

        this.sendSyncNextMessage();
    }
}
