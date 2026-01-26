import { SerialPort } from "serialport";
import { FRAME_START_OUTBOUND, FRAME_START_INBOUND } from "../constants";
import { Command } from "../commands/command";
import { Logger } from "pino";
import { ITransport, TransportConfig } from "./transport";

export interface SerialTransportConfig extends TransportConfig {
    portPath: string;
    baudRate: number;
}

export class SerialTransport implements ITransport {
    private port: SerialPort | null = null;
    private buffer: Buffer = Buffer.alloc(0);
    private onFrameCallback: ((data: Buffer) => void) | null = null;
    private reconnectTimer?: NodeJS.Timeout;
    private shouldReconnect: boolean = false;

    constructor(
        private config: SerialTransportConfig,
        private logger: Logger
    ) {}

    async connect(): Promise<boolean> {
        try {
            this.port = new SerialPort({
                path: this.config.portPath,
                baudRate: this.config.baudRate,
                autoOpen: false,
            });

            this.setupEventHandlers();
            await this.openPort();

            this.logger.info(
                `Connected to ${this.config.portPath} at ${this.config.baudRate} baud`
            );

            // Wait for device to initialize
            await new Promise((resolve) => setTimeout(resolve, 2000));

            this.shouldReconnect = this.config.autoReconnect ?? false;
            return true;
        } catch (err) {
            this.logger.error(
                `Failed to connect to ${this.config.portPath}: ${(err as Error).message}`
            );

            if (this.config.autoReconnect) {
                this.scheduleReconnect();
            }

            return false;
        }
    }

    private openPort(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.port) {
                reject(new Error("Port not initialized"));
                return;
            }

            this.port.open((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private setupEventHandlers(): void {
        if (!this.port) return;

        this.port.on("data", (data: Buffer) => {
            this.handleData(data);
        });

        this.port.on("error", (err) => {
            this.logger.error(`Serial port error: ${err.message}`);

            if (
                err.message.includes("Access denied") ||
                err.message.includes("Permission denied")
            ) {
                this.shouldReconnect = false;
            }
        });

        this.port.on("close", () => {
            this.logger.warn("Serial port closed");

            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        });

        this.port.on("open", () => {
            this.logger.info("Serial port opened");
            this.buffer = Buffer.alloc(0);
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        const delay = this.config.reconnectDelayMs ?? 5000;
        this.logger.info(`Scheduling reconnect in ${delay}ms...`);

        this.reconnectTimer = setTimeout(async () => {
            this.logger.info("Attempting to reconnect...");
            await this.connect();
        }, delay);
    }

    disconnect(): void {
        this.shouldReconnect = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        if (this.port && this.port.isOpen) {
            this.port.close((err) => {
                if (err) {
                    this.logger.error(`Error closing port: ${err.message}`);
                } else {
                    this.logger.info("Serial connection closed");
                }
            });
        }

        this.port = null;
    }

    isConnected(): boolean {
        return this.port !== null && this.port.isOpen;
    }

    private handleData(data: Buffer): void {
        this.buffer = Buffer.concat([this.buffer, data]);

        while (this.buffer.length >= 3) {
            if (this.buffer[0] !== FRAME_START_OUTBOUND) {
                this.buffer = this.buffer.slice(1);
                continue;
            }

            const length = this.buffer.readUInt16LE(1);

            if (this.buffer.length < 3 + length) {
                break;
            }

            const frameData = this.buffer.slice(3, 3 + length);
            this.buffer = this.buffer.slice(3 + length);

            if (this.onFrameCallback) {
                try {
                    this.onFrameCallback(frameData);
                } catch (err) {
                    this.logger.error(
                        `Error in frame callback: ${(err as Error).message}`
                    );
                }
            }
        }

        if (this.buffer.length > 4096) {
            this.logger.warn(
                `Buffer overflow (${this.buffer.length} bytes), clearing...`
            );
            this.buffer = Buffer.alloc(0);
        }
    }

    onFrame(callback: (data: Buffer) => void): void {
        this.onFrameCallback = callback;
    }

    sendCommand(command: Command): boolean {
        if (!this.isConnected()) {
            this.logger.error("Cannot send command: port not open");
            return false;
        }

        try {
            const data = command.toBuffer();
            const length = data.length;
            const frame = Buffer.alloc(3 + length);

            frame[0] = FRAME_START_INBOUND;
            frame.writeUInt16LE(length, 1);
            data.copy(frame, 3);

            this.port!.write(frame, (err) => {
                if (err) {
                    this.logger.error(
                        `Error writing to serial port: ${err.message}`
                    );
                }
            });

            return true;
        } catch (err) {
            this.logger.error(
                `Error sending command: ${(err as Error).message}`
            );
            return false;
        }
    }
}
