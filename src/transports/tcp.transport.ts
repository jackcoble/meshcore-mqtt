import * as net from "net";
import { FRAME_START_OUTBOUND, FRAME_START_INBOUND } from "../constants";
import { Command } from "../commands/base/command";
import { Logger } from "pino";
import { ITransport, TransportConfig } from "./transport";

export interface TcpTransportConfig extends TransportConfig {
    host: string;
    port: number;
    connectTimeoutMs?: number;
}

export class TcpTransport implements ITransport {
    private socket: net.Socket | null = null;
    private buffer: Buffer = Buffer.alloc(0);
    private onFrameCallback: ((data: Buffer) => void) | null = null;
    private reconnectTimer?: NodeJS.Timeout;
    private shouldReconnect: boolean = false;
    private isConnecting: boolean = false;

    constructor(
        private config: TcpTransportConfig,
        private logger: Logger
    ) {}

    async connect(): Promise<boolean> {
        if (this.isConnecting) {
            this.logger.warn("Connection already in progress");
            return false;
        }

        this.isConnecting = true;

        try {
            this.socket = new net.Socket();
            this.setupEventHandlers();

            await this.connectSocket();

            this.logger.info(
                `Connected to ${this.config.host}:${this.config.port}`
            );

            // Wait for device to initialize
            await new Promise((resolve) => setTimeout(resolve, 2000));

            this.shouldReconnect = this.config.autoReconnect ?? false;
            this.isConnecting = false;
            return true;
        } catch (err) {
            this.logger.error(
                `Failed to connect to ${this.config.host}:${this.config.port}: ${(err as Error).message}`
            );

            this.isConnecting = false;

            if (this.config.autoReconnect) {
                this.scheduleReconnect();
            }

            return false;
        }
    }

    private connectSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error("Socket not initialized"));
                return;
            }

            const timeout = this.config.connectTimeoutMs ?? 10000;
            const timer = setTimeout(() => {
                reject(new Error("Connection timeout"));
                this.socket?.destroy();
            }, timeout);

            this.socket.once("connect", () => {
                clearTimeout(timer);
                resolve();
            });

            this.socket.once("error", (err) => {
                clearTimeout(timer);
                reject(err);
            });

            this.socket.connect(this.config.port, this.config.host);
        });
    }

    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on("data", (data: Buffer) => {
            this.handleData(data);
        });

        this.socket.on("error", (err) => {
            this.logger.error(`TCP socket error: ${err.message}`);

            // Don't reconnect on certain errors
            if (
                err.message.includes("ECONNREFUSED") ||
                err.message.includes("EHOSTUNREACH")
            ) {
                // These might be temporary, allow reconnect
            }
        });

        this.socket.on("close", (hadError) => {
            this.logger.warn(
                `TCP socket closed${hadError ? " with error" : ""}`
            );

            if (this.shouldReconnect && !this.isConnecting) {
                this.scheduleReconnect();
            }
        });

        this.socket.on("connect", () => {
            this.logger.info("TCP socket connected");
            this.buffer = Buffer.alloc(0);
        });

        this.socket.on("timeout", () => {
            this.logger.warn("TCP socket timeout");
            this.socket?.destroy();
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

        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy();
            this.logger.info("TCP connection closed");
        }

        this.socket = null;
    }

    isConnected(): boolean {
        return (
            this.socket !== null &&
            !this.socket.destroyed &&
            this.socket.writable
        );
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
            this.logger.error("Cannot send command: socket not connected");
            return false;
        }

        try {
            const data = command.toBuffer();
            const length = data.length;
            const frame = Buffer.alloc(3 + length);

            frame[0] = FRAME_START_INBOUND;
            frame.writeUInt16LE(length, 1);
            data.copy(frame, 3);

            this.socket!.write(frame, (err) => {
                if (err) {
                    this.logger.error(
                        `Error writing to TCP socket: ${err.message}`
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
