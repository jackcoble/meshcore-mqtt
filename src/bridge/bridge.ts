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

/**
 * Bridge between MeshCore serial interface and MQTT.
 * Handles receiving messages from MeshCore and publishing them to MQTT topics.
 */
export class MeshCoreBridge {
    private running: boolean = false;
    private appStartReceived: boolean = false;
    private deviceInfoReceived: boolean = false;
    private syncingMessages: boolean = false;

    constructor(
        private transport: ITransport,
        private config: Config,
        private mqttClient: mqtt.MqttClient,
        private logger: Logger
    ) {
        this.transport.onFrame((data) => this.handleFrame(data));
        this.setupMqttSubscriptions();
    }

    /**
     * Setup MQTT subscriptions for incoming commands
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
     * @param message Buffer containing the JSON command
     */
    private handleIncomingCommand(message: Buffer): void {
        try {
            const json = JSON.parse(message.toString());
            this.logger.debug({ json }, "Received command from MQTT");

            const command = createCommandFromMessage(json);
            this.logger.info({ type: json.type }, "Sending command to device");

            this.transport.sendCommand(command);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : String(err);
            this.logger.error(
                { err, message: message.toString() },
                "Failed to process incoming command"
            );

            const response = JSON.stringify({
                success: false,
                error: errorMessage,
            });

            const allTopic = `${this.config.mqttTopic}/all`;
            this.mqttClient.publish(allTopic, response);
        }
    }

    /**
     * Handle incoming frame from MeshCore
     * @param data Buffer containing the frame data
     */
    private handleFrame(data: Buffer): void {
        this.logger.debug(
            `Received frame: ${data.length} bytes, code: 0x${data[0].toString(16)}`
        );

        // Set the Topic and Payload
        let topic: string | null = null;
        let payload: any = null;

        // Check the first byte to determine the type of response
        switch (data[0]) {
            case ResponseCode.SELF_INFO:
                this.logger.info("Received SELF_INFO response from MeshCore");

                try {
                    const info = new AppStartCommand().fromBuffer(data);
                    this.logger.debug({ info }, "Parsed SELF_INFO data");

                    this.appStartReceived = true;

                    topic = `${this.config.mqttTopic}/self_info`;
                    payload = info;

                    // After receiving SELF_INFO, must send DEVICE_QUERY
                    if (!this.deviceInfoReceived) {
                        this.sendDeviceQuery();
                    }
                } catch (err) {
                    this.logger.error(
                        { err },
                        "Failed to parse SELF_INFO response"
                    );
                }

                break;

            case ResponseCode.DEVICE_INFO:
                this.logger.info("Received DEVICE_INFO response from MeshCore");

                try {
                    const deviceInfo = new DeviceQueryCommand().fromBuffer(
                        data
                    );
                    this.logger.debug(
                        { deviceInfo },
                        "Parsed DEVICE_INFO data"
                    );

                    this.deviceInfoReceived = true;

                    topic = `${this.config.mqttTopic}/device_info`;
                    payload = deviceInfo;

                    // Start syncing messages after device info is received
                    this.startMessageSync();
                } catch (err) {
                    this.logger.error(
                        { err },
                        "Failed to parse DEVICE_INFO response"
                    );
                }
                break;

            // Messages
            case ResponseCode.CONTACT_MSG_RECV:
            case ResponseCode.CHANNEL_MSG_RECV:
            case ResponseCode.CONTACT_MSG_RECV_V3:
            case ResponseCode.CHANNEL_MSG_RECV_V3:
                this.logger.info(
                    `Received ${ResponseCode[data[0]]} from MeshCore`
                );

                const message = new SyncNextMessageCommand();
                const messageData: any = message.fromBuffer(data);

                // Determine if its channel
                if (message.isChannelMessage()) {
                    // Message was sent in a channel
                    topic = `${this.config.mqttTopic}/message/channel/${messageData.channel_idx}`;
                } else if (message.isDirectMessage()) {
                    // Message was sent directly
                    topic = `${this.config.mqttTopic}/message/direct/${messageData.pubkey_prefix}`;
                }

                payload = messageData;

                // Continue syncing messages
                if (this.syncingMessages) {
                    this.sendSyncNextMessage();
                }

                break;

            case ResponseCode.NO_MORE_MESSAGES:
                this.logger.info("Received NO_MORE_MESSAGES from MeshCore");
                this.syncingMessages = false;
                this.logger.info("Message sync completed");
                break;

            case ResponseCode.BATT_AND_STORAGE:
                this.logger.info(
                    "Received BATT_AND_STORAGE response from MeshCore"
                );

                const batteryAndStorage = new GetBatteryAndStorageCommand();
                const response = batteryAndStorage.fromBuffer(data);

                topic = `${this.config.mqttTopic}/battery_and_storage`;
                payload = response;

                break;

            // Push Codes - can be pushed to the App (this bridge) at any time
            case PushCode.MSG_WAITING:
                this.logger.info("Received MSG_WAITING. Starting message sync");
                this.startMessageSync();

                break;

            default:
                this.logger.warn(
                    `Unknown response code: 0x${data[0].toString(16)}`
                );

                break;
        }

        // Publish to MQTT if we have a topic and payload
        if (topic && payload) {
            this.mqttClient.publish(
                topic,
                JSON.stringify(payload),
                { qos: 1 },
                (err) => {
                    if (err) {
                        this.logger.error(
                            { err, topic },
                            "Failed to publish to MQTT"
                        );
                    } else {
                        this.logger.debug({ topic }, "Published to MQTT");
                    }
                }
            );

            // Publish to "all" topic
            this.mqttClient.publish(
                `${this.config.mqttTopic}/all`,
                JSON.stringify(payload)
            );
        }
    }

    /**
     * Send AppStart command to MeshCore
     */
    private sendAppStart() {
        this.logger.info("Sending AppStart command to MeshCore");
        const appStartCmd = new AppStartCommand();
        this.transport.sendCommand(appStartCmd);
    }

    /**
     * Send DeviceQuery command to MeshCore
     */
    private sendDeviceQuery(): void {
        this.logger.info("Sending DeviceQuery command to MeshCore");
        const deviceQueryCmd = new DeviceQueryCommand();
        this.transport.sendCommand(deviceQueryCmd);
    }

    /**
     * Send SyncNextMessage command to MeshCore
     */
    private sendSyncNextMessage(): void {
        this.logger.info("Sending SyncNextMessage command to MeshCore");
        const syncNextMessageCommand = new SyncNextMessageCommand();
        this.transport.sendCommand(syncNextMessageCommand);
    }

    /**
     * Start syncing messages from MeshCore
     */
    private startMessageSync(): void {
        if (this.syncingMessages) {
            this.logger.debug("Already syncing messages, skipping");
            return;
        }

        this.logger.info("Starting message sync");
        this.syncingMessages = true;
        this.sendSyncNextMessage();
    }

    /**
     * Start the bridge and send initial commands
     */
    start(): void {
        this.running = true;
        this.logger.info("MeshCore to MQTT Bridge started");
        this.sendAppStart();
    }

    /**
     * Stop the bridge
     */
    stop(): void {
        this.running = false;
        this.mqttClient.end();
        this.logger.info("Bridge stopped");
    }
}
