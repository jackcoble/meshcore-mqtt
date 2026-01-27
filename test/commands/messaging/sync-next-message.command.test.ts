import { describe, it, expect } from "vitest";
import { SyncNextMessageCommand } from "../../../src/commands/messaging/sync-next-message.command";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

describe("SyncNextMessageCommand", () => {
    describe("static properties", () => {
        it("should have correct type", () => {
            expect(SyncNextMessageCommand.type).toBe("sync_next_message");
        });
    });

    describe("instance properties", () => {
        it("should have correct command code", () => {
            const command = new SyncNextMessageCommand();
            expect(command.commandCode).toBe(CommandCode.SYNC_NEXT_MESSAGE);
        });

        it("should expect multiple response types", () => {
            const command = new SyncNextMessageCommand();
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.NO_MORE_MESSAGES,
                ResponseCode.CONTACT_MSG_RECV,
                ResponseCode.CHANNEL_MSG_RECV,
                ResponseCode.CONTACT_MSG_RECV_V3,
                ResponseCode.CHANNEL_MSG_RECV_V3,
            ]);
        });
    });

    describe("toBuffer", () => {
        it("should serialise command correctly", () => {
            const command = new SyncNextMessageCommand();
            const buffer = command.toBuffer();

            expect(buffer.length).toBe(1);
            expect(buffer[0]).toBe(CommandCode.SYNC_NEXT_MESSAGE);
        });

        it("should produce consistent output on multiple calls", () => {
            const command = new SyncNextMessageCommand();
            const buffer1 = command.toBuffer();
            const buffer2 = command.toBuffer();

            expect(buffer1).toEqual(buffer2);
        });
    });

    describe("fromBuffer - NO_MORE_MESSAGES", () => {
        it("should handle NO_MORE_MESSAGES response", () => {
            const command = new SyncNextMessageCommand();
            const buffer = Buffer.from([ResponseCode.NO_MORE_MESSAGES]);

            const result = command.fromBuffer(buffer);

            expect(result).toBeUndefined();
        });
    });

    describe("fromBuffer - CONTACT_MSG_RECV", () => {
        it("should deserialise contact message correctly", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(50);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.CONTACT_MSG_RECV, offset++);
            // pubkey prefix (6 bytes)
            Buffer.from([0xab, 0xcd, 0xef, 0x12, 0x34, 0x56]).copy(
                buffer,
                offset
            );
            offset += 6;
            buffer.writeUInt8(3, offset++); // pathLen
            buffer.writeUInt8(0, offset++); // txtType (PLAIN)
            buffer.writeUInt32LE(1705320000, offset); // senderTimestamp
            offset += 4;
            Buffer.from("Hello from contact", "utf8").copy(buffer, offset);
            offset += 18;

            const result = command.fromBuffer(buffer.subarray(0, offset)) as {
                code: number;
                pubkey_prefix: string;
                path_len: number;
                txt_type: number;
                sender_timestamp: number;
                text: string;
            };

            expect(result.code).toBe(ResponseCode.CONTACT_MSG_RECV);
            expect(result.pubkey_prefix).toBe("abcdef123456");
            expect(result.path_len).toBe(3);
            expect(result.txt_type).toBe(0);
            expect(result.sender_timestamp).toBe(1705320000);
            expect(result.text).toBe("Hello from contact");
        });

        it("should handle direct path (0xff) as -1", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(20);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.CONTACT_MSG_RECV, offset++);
            Buffer.alloc(6).copy(buffer, offset); // pubkey prefix
            offset += 6;
            buffer.writeUInt8(0xff, offset++); // DIRECT_PATH_LEN
            buffer.writeUInt8(0, offset++); // txtType
            buffer.writeUInt32LE(0, offset); // senderTimestamp
            offset += 4;
            Buffer.from("Hi", "utf8").copy(buffer, offset);

            const result = command.fromBuffer(buffer) as { path_len: number };

            expect(result.path_len).toBe(-1);
        });

        it("should set isDirectMessage to true", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(20);
            buffer.writeUInt8(ResponseCode.CONTACT_MSG_RECV, 0);
            Buffer.alloc(6).copy(buffer, 1);
            buffer.writeUInt8(1, 7);
            buffer.writeUInt8(0, 8);
            buffer.writeUInt32LE(0, 9);

            command.fromBuffer(buffer);

            expect(command.isDirectMessage()).toBe(true);
            expect(command.isChannelMessage()).toBe(false);
        });
    });

    describe("fromBuffer - CHANNEL_MSG_RECV", () => {
        it("should deserialise channel message correctly", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(50);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.CHANNEL_MSG_RECV, offset++);
            buffer.writeUInt8(2, offset++); // channelIdx
            buffer.writeUInt8(5, offset++); // pathLen
            buffer.writeUInt8(1, offset++); // txtType
            buffer.writeUInt32LE(1705400000, offset); // senderTimestamp
            offset += 4;
            Buffer.from("Channel message", "utf8").copy(buffer, offset);
            offset += 15;

            const result = command.fromBuffer(buffer.subarray(0, offset)) as {
                code: number;
                channel_idx: number;
                path_len: number;
                txt_type: number;
                sender_timestamp: number;
                text: string;
            };

            expect(result.code).toBe(ResponseCode.CHANNEL_MSG_RECV);
            expect(result.channel_idx).toBe(2);
            expect(result.path_len).toBe(5);
            expect(result.txt_type).toBe(1);
            expect(result.sender_timestamp).toBe(1705400000);
            expect(result.text).toBe("Channel message");
        });

        it("should handle direct path (0xff) as -1", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(15);
            buffer.writeUInt8(ResponseCode.CHANNEL_MSG_RECV, 0);
            buffer.writeUInt8(0, 1); // channelIdx
            buffer.writeUInt8(0xff, 2); // DIRECT_PATH_LEN
            buffer.writeUInt8(0, 3); // txtType
            buffer.writeUInt32LE(0, 4); // senderTimestamp

            const result = command.fromBuffer(buffer) as { path_len: number };

            expect(result.path_len).toBe(-1);
        });

        it("should set isChannelMessage to true", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(15);
            buffer.writeUInt8(ResponseCode.CHANNEL_MSG_RECV, 0);
            buffer.writeUInt8(0, 1);
            buffer.writeUInt8(1, 2);
            buffer.writeUInt8(0, 3);
            buffer.writeUInt32LE(0, 4);

            command.fromBuffer(buffer);

            expect(command.isChannelMessage()).toBe(true);
            expect(command.isDirectMessage()).toBe(false);
        });
    });

    describe("fromBuffer - CONTACT_MSG_RECV_V3", () => {
        it("should deserialise V3 contact message correctly with SNR", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(50);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.CONTACT_MSG_RECV_V3, offset++);
            buffer.writeUInt8(40, offset++); // SNR (40/4 = 10.0)
            buffer.writeUInt8(0, offset++); // reserved
            buffer.writeUInt8(0, offset++); // reserved
            // pubkey prefix (6 bytes)
            Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]).copy(
                buffer,
                offset
            );
            offset += 6;
            buffer.writeUInt8(2, offset++); // pathLen
            buffer.writeUInt8(0, offset++); // txtType
            buffer.writeUInt32LE(1705500000, offset); // senderTimestamp
            offset += 4;
            Buffer.from("V3 contact msg", "utf8").copy(buffer, offset);
            offset += 14;

            const result = command.fromBuffer(buffer.subarray(0, offset)) as {
                code: number;
                snr: number;
                pubkey_prefix: string;
                path_len: number;
                txt_type: number;
                sender_timestamp: number;
                text: string;
            };

            expect(result.code).toBe(ResponseCode.CONTACT_MSG_RECV_V3);
            expect(result.snr).toBe(10.0);
            expect(result.pubkey_prefix).toBe("112233445566");
            expect(result.path_len).toBe(2);
            expect(result.txt_type).toBe(0);
            expect(result.sender_timestamp).toBe(1705500000);
            expect(result.text).toBe("V3 contact msg");
        });

        it("should handle fractional SNR values", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(20);
            buffer.writeUInt8(ResponseCode.CONTACT_MSG_RECV_V3, 0);
            buffer.writeUInt8(25, 1); // SNR (25/4 = 6.25)
            buffer.writeUInt8(0, 2);
            buffer.writeUInt8(0, 3);
            Buffer.alloc(6).copy(buffer, 4);
            buffer.writeUInt8(1, 10);
            buffer.writeUInt8(0, 11);
            buffer.writeUInt32LE(0, 12);

            const result = command.fromBuffer(buffer) as { snr: number };

            expect(result.snr).toBe(6.25);
        });

        it("should set isDirectMessage to true for V3", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(20);
            buffer.writeUInt8(ResponseCode.CONTACT_MSG_RECV_V3, 0);
            buffer.writeUInt8(0, 1);
            buffer.writeUInt8(0, 2);
            buffer.writeUInt8(0, 3);
            Buffer.alloc(6).copy(buffer, 4);
            buffer.writeUInt8(1, 10);
            buffer.writeUInt8(0, 11);
            buffer.writeUInt32LE(0, 12);

            command.fromBuffer(buffer);

            expect(command.isDirectMessage()).toBe(true);
            expect(command.isChannelMessage()).toBe(false);
        });
    });

    describe("fromBuffer - CHANNEL_MSG_RECV_V3", () => {
        it("should deserialise V3 channel message correctly with SNR", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(50);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.CHANNEL_MSG_RECV_V3, offset++);
            buffer.writeUInt8(32, offset++); // SNR (32/4 = 8.0)
            buffer.writeUInt8(0, offset++); // reserved
            buffer.writeUInt8(0, offset++); // reserved
            buffer.writeUInt8(1, offset++); // channelIdx
            buffer.writeUInt8(4, offset++); // pathLen
            buffer.writeUInt8(0, offset++); // txtType
            buffer.writeUInt32LE(1705600000, offset); // senderTimestamp
            offset += 4;
            Buffer.from("V3 channel msg", "utf8").copy(buffer, offset);
            offset += 14;

            const result = command.fromBuffer(buffer.subarray(0, offset)) as {
                code: number;
                snr: number;
                channel_idx: number;
                path_len: number;
                txt_type: number;
                sender_timestamp: number;
                text: string;
            };

            expect(result.code).toBe(ResponseCode.CHANNEL_MSG_RECV_V3);
            expect(result.snr).toBe(8.0);
            expect(result.channel_idx).toBe(1);
            expect(result.path_len).toBe(4);
            expect(result.txt_type).toBe(0);
            expect(result.sender_timestamp).toBe(1705600000);
            expect(result.text).toBe("V3 channel msg");
        });

        it("should handle direct path in V3", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(15);
            buffer.writeUInt8(ResponseCode.CHANNEL_MSG_RECV_V3, 0);
            buffer.writeUInt8(20, 1); // SNR
            buffer.writeUInt8(0, 2);
            buffer.writeUInt8(0, 3);
            buffer.writeUInt8(0, 4); // channelIdx
            buffer.writeUInt8(0xff, 5); // DIRECT_PATH_LEN
            buffer.writeUInt8(0, 6); // txtType
            buffer.writeUInt32LE(0, 7);

            const result = command.fromBuffer(buffer) as { path_len: number };

            expect(result.path_len).toBe(-1);
        });

        it("should set isChannelMessage to true for V3", () => {
            const command = new SyncNextMessageCommand();

            const buffer = Buffer.alloc(15);
            buffer.writeUInt8(ResponseCode.CHANNEL_MSG_RECV_V3, 0);
            buffer.writeUInt8(0, 1);
            buffer.writeUInt8(0, 2);
            buffer.writeUInt8(0, 3);
            buffer.writeUInt8(0, 4);
            buffer.writeUInt8(1, 5);
            buffer.writeUInt8(0, 6);
            buffer.writeUInt32LE(0, 7);

            command.fromBuffer(buffer);

            expect(command.isChannelMessage()).toBe(true);
            expect(command.isDirectMessage()).toBe(false);
        });
    });

    describe("fromBuffer - error handling", () => {
        it("should throw on unexpected response code", () => {
            const command = new SyncNextMessageCommand();
            const buffer = Buffer.from([ResponseCode.DEVICE_INFO]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });

        it("should throw on OK response code", () => {
            const command = new SyncNextMessageCommand();
            const buffer = Buffer.from([ResponseCode.OK]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });

        it("should throw on ERR response code", () => {
            const command = new SyncNextMessageCommand();
            const buffer = Buffer.from([ResponseCode.ERR]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });
    });

    describe("message type helpers", () => {
        it("should initialise with undefined message type state", () => {
            const command = new SyncNextMessageCommand();

            // Before any response is processed, these should return false
            expect(command.isDirectMessage()).toBe(false);
            expect(command.isChannelMessage()).toBe(false);
        });
    });
});
