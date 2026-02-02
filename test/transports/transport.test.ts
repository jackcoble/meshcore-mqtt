import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SerialTransport } from "../../src/transports/serial.transport";
import { TcpTransport } from "../../src/transports/tcp.transport";
import { Command } from "../../src/commands/base/command";
import { CommandCode } from "../../src/commands/enums/command-codes";
import { ResponseCode } from "../../src/commands/enums/response-codes";
import { FRAME_START_INBOUND, FRAME_START_OUTBOUND } from "../../src/constants";
import pino from "pino";

// Mock command for testing
class MockCommand extends Command {
    static readonly type = "mock";
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK];

    toBuffer(): Buffer {
        return Buffer.from([this.commandCode, 0x01, 0x02]);
    }

    fromBuffer(data: Buffer): object {
        return {};
    }
}

describe("Transport", () => {
    let logger: pino.Logger;

    beforeEach(() => {
        logger = pino({ level: "silent" });
    });

    describe("SerialTransport", () => {
        describe("frame handling", () => {
            it("should parse complete frame correctly", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                const payload = Buffer.from([0x01, 0x02, 0x03]);
                const frame = Buffer.alloc(3 + payload.length);
                frame[0] = FRAME_START_OUTBOUND;
                frame.writeUInt16LE(payload.length, 1);
                payload.copy(frame, 3);

                // Simulate data reception
                (transport as any).handleData(frame);

                expect(receivedFrames).toHaveLength(1);
                expect(receivedFrames[0]).toEqual(payload);
            });

            it("should handle fragmented frames", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                const payload = Buffer.from([0x01, 0x02, 0x03, 0x04]);
                const frame = Buffer.alloc(3 + payload.length);
                frame[0] = FRAME_START_OUTBOUND;
                frame.writeUInt16LE(payload.length, 1);
                payload.copy(frame, 3);

                // Send frame in parts
                (transport as any).handleData(frame.slice(0, 4));
                expect(receivedFrames).toHaveLength(0);

                (transport as any).handleData(frame.slice(4));
                expect(receivedFrames).toHaveLength(1);
                expect(receivedFrames[0]).toEqual(payload);
            });

            it("should skip invalid frame start bytes", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                // Send garbage data followed by valid frame
                const garbage = Buffer.from([0xff, 0xfe, 0xfd]);
                const payload = Buffer.from([0x01, 0x02]);
                const validFrame = Buffer.alloc(3 + payload.length);
                validFrame[0] = FRAME_START_OUTBOUND;
                validFrame.writeUInt16LE(payload.length, 1);
                payload.copy(validFrame, 3);

                (transport as any).handleData(
                    Buffer.concat([garbage, validFrame])
                );

                expect(receivedFrames).toHaveLength(1);
                expect(receivedFrames[0]).toEqual(payload);
            });

            it("should handle multiple frames in one buffer", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                const payload1 = Buffer.from([0x01]);
                const payload2 = Buffer.from([0x02, 0x03]);

                const frame1 = Buffer.alloc(3 + payload1.length);
                frame1[0] = FRAME_START_OUTBOUND;
                frame1.writeUInt16LE(payload1.length, 1);
                payload1.copy(frame1, 3);

                const frame2 = Buffer.alloc(3 + payload2.length);
                frame2[0] = FRAME_START_OUTBOUND;
                frame2.writeUInt16LE(payload2.length, 1);
                payload2.copy(frame2, 3);

                (transport as any).handleData(Buffer.concat([frame1, frame2]));

                expect(receivedFrames).toHaveLength(2);
                expect(receivedFrames[0]).toEqual(payload1);
                expect(receivedFrames[1]).toEqual(payload2);
            });

            it("should clear buffer on overflow", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                // Fill buffer with garbage data beyond threshold
                const garbage = Buffer.alloc(5000).fill(0xff);
                (transport as any).handleData(garbage);

                expect((transport as any).buffer.length).toBeLessThan(4096);
            });

            it("should handle frame callback errors gracefully", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                transport.onFrame(() => {
                    throw new Error("Callback error");
                });

                const payload = Buffer.from([0x01]);
                const frame = Buffer.alloc(3 + payload.length);
                frame[0] = FRAME_START_OUTBOUND;
                frame.writeUInt16LE(payload.length, 1);
                payload.copy(frame, 3);

                // Should not throw
                expect(() =>
                    (transport as any).handleData(frame)
                ).not.toThrow();
            });
        });

        describe("sendCommand", () => {
            it("should return false when not connected", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                const command = new MockCommand();
                expect(transport.sendCommand(command)).toBe(false);
            });

            it("should build frame correctly", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );

                // Mock the port
                const writtenData: Buffer[] = [];
                (transport as any).port = {
                    isOpen: true,
                    write: (data: Buffer, callback: Function) => {
                        writtenData.push(data);
                        callback();
                    },
                };

                const command = new MockCommand();
                const result = transport.sendCommand(command);

                expect(result).toBe(true);
                expect(writtenData).toHaveLength(1);

                const frame = writtenData[0];
                expect(frame[0]).toBe(FRAME_START_INBOUND);
                expect(frame.readUInt16LE(1)).toBe(3); // command payload length
                expect(frame.slice(3)).toEqual(command.toBuffer());
            });
        });

        describe("isConnected", () => {
            it("should return false when port is null", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );
                expect(transport.isConnected()).toBe(false);
            });

            it("should return false when port is closed", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );
                (transport as any).port = { isOpen: false };
                expect(transport.isConnected()).toBe(false);
            });

            it("should return true when port is open", () => {
                const transport = new SerialTransport(
                    { portPath: "/dev/test", baudRate: 115200 },
                    logger
                );
                (transport as any).port = { isOpen: true };
                expect(transport.isConnected()).toBe(true);
            });
        });
    });

    describe("TcpTransport", () => {
        describe("frame handling", () => {
            it("should parse complete frame correctly", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                const payload = Buffer.from([0x01, 0x02, 0x03]);
                const frame = Buffer.alloc(3 + payload.length);
                frame[0] = FRAME_START_OUTBOUND;
                frame.writeUInt16LE(payload.length, 1);
                payload.copy(frame, 3);

                (transport as any).handleData(frame);

                expect(receivedFrames).toHaveLength(1);
                expect(receivedFrames[0]).toEqual(payload);
            });

            it("should handle fragmented frames", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                const payload = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
                const frame = Buffer.alloc(3 + payload.length);
                frame[0] = FRAME_START_OUTBOUND;
                frame.writeUInt16LE(payload.length, 1);
                payload.copy(frame, 3);

                // Send in fragments
                (transport as any).handleData(frame.slice(0, 3));
                expect(receivedFrames).toHaveLength(0);

                (transport as any).handleData(frame.slice(3, 6));
                expect(receivedFrames).toHaveLength(0);

                (transport as any).handleData(frame.slice(6));
                expect(receivedFrames).toHaveLength(1);
                expect(receivedFrames[0]).toEqual(payload);
            });

            it("should skip invalid frame start bytes", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );

                const receivedFrames: Buffer[] = [];
                transport.onFrame((data) => receivedFrames.push(data));

                const garbage = Buffer.from([0x00, 0x11, 0x22]);
                const payload = Buffer.from([0xaa, 0xbb]);
                const validFrame = Buffer.alloc(3 + payload.length);
                validFrame[0] = FRAME_START_OUTBOUND;
                validFrame.writeUInt16LE(payload.length, 1);
                payload.copy(validFrame, 3);

                (transport as any).handleData(
                    Buffer.concat([garbage, validFrame])
                );

                expect(receivedFrames).toHaveLength(1);
                expect(receivedFrames[0]).toEqual(payload);
            });

            it("should clear buffer on overflow", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );

                const garbage = Buffer.alloc(5000).fill(0xee);
                (transport as any).handleData(garbage);

                expect((transport as any).buffer.length).toBeLessThan(4096);
            });
        });

        describe("sendCommand", () => {
            it("should return false when not connected", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );

                const command = new MockCommand();
                expect(transport.sendCommand(command)).toBe(false);
            });

            it("should build frame correctly", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );

                const writtenData: Buffer[] = [];
                (transport as any).socket = {
                    destroyed: false,
                    writable: true,
                    write: (data: Buffer, callback: Function) => {
                        writtenData.push(data);
                        callback();
                    },
                };

                const command = new MockCommand();
                const result = transport.sendCommand(command);

                expect(result).toBe(true);
                expect(writtenData).toHaveLength(1);

                const frame = writtenData[0];
                expect(frame[0]).toBe(FRAME_START_INBOUND);
                expect(frame.readUInt16LE(1)).toBe(3);
                expect(frame.slice(3)).toEqual(command.toBuffer());
            });
        });

        describe("isConnected", () => {
            it("should return false when socket is null", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );
                expect(transport.isConnected()).toBe(false);
            });

            it("should return false when socket is destroyed", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );
                (transport as any).socket = {
                    destroyed: true,
                    writable: false,
                };
                expect(transport.isConnected()).toBe(false);
            });

            it("should return false when socket is not writable", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );
                (transport as any).socket = {
                    destroyed: false,
                    writable: false,
                };
                expect(transport.isConnected()).toBe(false);
            });

            it("should return true when socket is connected and writable", () => {
                const transport = new TcpTransport(
                    { host: "localhost", port: 5000 },
                    logger
                );
                (transport as any).socket = {
                    destroyed: false,
                    writable: true,
                };
                expect(transport.isConnected()).toBe(true);
            });
        });
    });
});
