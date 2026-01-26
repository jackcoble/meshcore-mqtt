import mqtt from "mqtt";
import { ITransport } from "./transports/transport";
import { Logger } from "pino";
import { EventType } from "./events";
import {
    AppStartCommand,
    DeviceQueryCommand,
    ResponseCode,
    SyncNextMessageCommand,
} from "./commands";
import { PushCode } from "./constants";

/**
 * Bridge between MeshCore serial interface and MQTT.
 * Handles receiving messages from MeshCore and publishing them to MQTT topics.
 */
export class MeshCoreBridge {
    private running: boolean = false;
    private appStartReceived: boolean = false;
    private deviceInfoReceived: boolean = false;

    constructor(
        private transport: ITransport,
        private mqttClient: mqtt.MqttClient,
        private logger: Logger
    ) {
        this.transport.onFrame((data) => this.handleFrame(data));
    }

    /**
     * Handle incoming frame from MeshCore
     * @param data Buffer containing the frame data
     */
    private handleFrame(data: Buffer): void {
        this.logger.debug(
            { eventType: EventType.MESHCORE_EVENT },
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

                    topic = "meshcore/self_info";
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

                    topic = "meshcore/device_info";
                    payload = deviceInfo;
                } catch (err) {
                    this.logger.error(
                        { err },
                        "Failed to parse DEVICE_INFO response"
                    );
                }
                break;

            case ResponseCode.CHANNEL_MSG_RECV_V3:
                this.logger.info("Received CHANNEL_MSG_RECV_V3 from MeshCore");

                const channelMessage = new SyncNextMessageCommand().fromBuffer(
                    data
                );

                topic = `meshcore/channels/${channelMessage.channel_idx}`;
                payload = channelMessage;

                break;

            // Push Codes - can be pushed to the App (this bridge) at any time
            case PushCode.MSG_WAITING:
                this.logger.info(
                    "Received MSG_WAITING. Sending CMD_SYNC_NEXT_MESSAGE"
                );

                this.sendSyncNextMessage();

                break;

            default:
                this.logger.warn(
                    { eventType: EventType.MESHCORE_EVENT },
                    `Unknown response code: 0x${data[0].toString(16)}`
                );

                topic = "meshcore/unknown";
                payload = data;
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
