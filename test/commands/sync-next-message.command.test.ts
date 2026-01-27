import {
    SyncNextMessageCommand,
    ResponseCode,
    CommandCode,
} from "../../src/commands";
import { beforeEach, describe, expect, it } from "vitest";

describe("SyncNextMessageCommand", () => {
    let command: SyncNextMessageCommand;

    beforeEach(() => {
        command = new SyncNextMessageCommand();
    });

    describe("constructor", () => {
        it("should create an instance", () => {
            expect(command).toBeInstanceOf(SyncNextMessageCommand);
        });

        it("should have correct commandCode", () => {
            expect(command.commandCode).toBe(CommandCode.SYNC_NEXT_MESSAGE);
        });

        it("should have correct expectedResponseCodes", () => {
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.NO_MORE_MESSAGES,
                ResponseCode.CONTACT_MSG_RECV,
                ResponseCode.CHANNEL_MSG_RECV,
                ResponseCode.CONTACT_MSG_RECV_V3,
                ResponseCode.CHANNEL_MSG_RECV_V3,
            ]);
        });
    });

    describe("isDirectMessage", () => {
        it("should return true for CONTACT_MSG_RECV", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CONTACT_MSG_RECV]),
                Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]), // pubkey prefix
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isDirectMessage()).toBe(true);
        });

        it("should return true for CONTACT_MSG_RECV_V3", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CONTACT_MSG_RECV_V3]),
                Buffer.from([0x28]), // snr
                Buffer.from([0x00, 0x00]), // reserved
                Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]), // pubkey prefix
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isDirectMessage()).toBe(true);
        });

        it("should return false for CHANNEL_MSG_RECV", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CHANNEL_MSG_RECV]),
                Buffer.from([0x01]), // channel_idx
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isDirectMessage()).toBe(false);
        });

        it("should return false for CHANNEL_MSG_RECV_V3", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CHANNEL_MSG_RECV_V3]),
                Buffer.from([0x28]), // snr
                Buffer.from([0x00, 0x00]), // reserved
                Buffer.from([0x01]), // channel_idx
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isDirectMessage()).toBe(false);
        });
    });

    describe("isChannelMessage", () => {
        it("should return true for CHANNEL_MSG_RECV", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CHANNEL_MSG_RECV]),
                Buffer.from([0x01]), // channel_idx
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isChannelMessage()).toBe(true);
        });

        it("should return true for CHANNEL_MSG_RECV_V3", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CHANNEL_MSG_RECV_V3]),
                Buffer.from([0x28]), // snr
                Buffer.from([0x00, 0x00]), // reserved
                Buffer.from([0x01]), // channel_idx
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isChannelMessage()).toBe(true);
        });

        it("should return false for CONTACT_MSG_RECV", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CONTACT_MSG_RECV]),
                Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]), // pubkey prefix
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isChannelMessage()).toBe(false);
        });

        it("should return false for CONTACT_MSG_RECV_V3", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.CONTACT_MSG_RECV_V3]),
                Buffer.from([0x28]), // snr
                Buffer.from([0x00, 0x00]), // reserved
                Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]), // pubkey prefix
                Buffer.from([0x01]), // path_len
                Buffer.from([0x01]), // txt_type
                Buffer.alloc(4), // timestamp
                Buffer.from("test", "utf8"),
            ]);

            command.fromBuffer(buffer);

            expect(command.isChannelMessage()).toBe(false);
        });
    });

    describe("toBuffer", () => {
        it("should serialise to correct buffer format", () => {
            const buffer = command.toBuffer();

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBe(1);
            expect(buffer[0]).toBe(CommandCode.SYNC_NEXT_MESSAGE);
        });
    });

    describe("fromBuffer", () => {
        describe("CONTACT_MSG_RECV", () => {
            it("should parse CONTACT_MSG_RECV response correctly", () => {
                const pubkeyPrefix = Buffer.from([
                    0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
                ]);
                const pathLen = 5;
                const txtType = 1;
                const senderTimestamp = 1769465771;
                const text = "Hello World";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CONTACT_MSG_RECV]),
                    pubkeyPrefix,
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4), // timestamp placeholder
                    Buffer.from(text, "utf8"),
                ]);

                // Write timestamp as little-endian
                buffer.writeUInt32LE(senderTimestamp, 9);

                const result = command.fromBuffer(buffer);

                expect(result).toEqual({
                    code: ResponseCode.CONTACT_MSG_RECV,
                    pubkey_prefix: "010203040506",
                    path_len: pathLen,
                    txt_type: txtType,
                    sender_timestamp: senderTimestamp,
                    text: text,
                });
            });

            it("should handle path_len of 0xff as -1 (direct message)", () => {
                const pubkeyPrefix = Buffer.from([
                    0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
                ]);
                const pathLen = 0xff;
                const txtType = 1;
                const senderTimestamp = 1769465771;
                const text = "Test";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CONTACT_MSG_RECV]),
                    pubkeyPrefix,
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 9);

                const result = command.fromBuffer(buffer);

                expect(result).toMatchObject({
                    path_len: -1,
                });
            });
        });

        describe("CHANNEL_MSG_RECV", () => {
            it("should parse CHANNEL_MSG_RECV response correctly", () => {
                const channelIdx = 3;
                const pathLen = 7;
                const txtType = 2;
                const senderTimestamp = 1769465771;
                const text = "Channel message";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CHANNEL_MSG_RECV]),
                    Buffer.from([channelIdx]),
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 4);

                const result = command.fromBuffer(buffer);

                expect(result).toEqual({
                    code: ResponseCode.CHANNEL_MSG_RECV,
                    channel_idx: channelIdx,
                    path_len: pathLen,
                    txt_type: txtType,
                    sender_timestamp: senderTimestamp,
                    text: text,
                });
            });

            it("should handle path_len of 0xff as -1 (direct message)", () => {
                const channelIdx = 1;
                const pathLen = 0xff;
                const txtType = 1;
                const senderTimestamp = 1769465771;
                const text = "Test";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CHANNEL_MSG_RECV]),
                    Buffer.from([channelIdx]),
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 4);

                const result = command.fromBuffer(buffer);

                expect(result).toMatchObject({
                    path_len: -1,
                });
            });
        });

        describe("CONTACT_MSG_RECV_V3", () => {
            it("should parse CONTACT_MSG_RECV_V3 response correctly", () => {
                const snrRaw = 40; // SNR = 40/4 = 10
                const pubkeyPrefix = Buffer.from([
                    0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
                ]);
                const pathLen = 8;
                const txtType = 3;
                const senderTimestamp = 1769465771;
                const text = "V3 Contact message";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CONTACT_MSG_RECV_V3]),
                    Buffer.from([snrRaw]),
                    Buffer.from([0x00, 0x00]), // 2 reserved bytes
                    pubkeyPrefix,
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 12);

                const result = command.fromBuffer(buffer);

                expect(result).toEqual({
                    code: ResponseCode.CONTACT_MSG_RECV_V3,
                    snr: 10,
                    pubkey_prefix: "aabbccddeeff",
                    path_len: pathLen,
                    txt_type: txtType,
                    sender_timestamp: senderTimestamp,
                    text: text,
                });
            });

            it("should handle path_len of 0xff as -1 (direct message)", () => {
                const snrRaw = 20;
                const pubkeyPrefix = Buffer.from([
                    0x11, 0x22, 0x33, 0x44, 0x55, 0x66,
                ]);
                const pathLen = 0xff;
                const txtType = 1;
                const senderTimestamp = 1769465771;
                const text = "Test";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CONTACT_MSG_RECV_V3]),
                    Buffer.from([snrRaw]),
                    Buffer.from([0x00, 0x00]),
                    pubkeyPrefix,
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 12);

                const result = command.fromBuffer(buffer);

                expect(result).toMatchObject({
                    path_len: -1,
                });
            });
        });

        describe("CHANNEL_MSG_RECV_V3", () => {
            it("should parse CHANNEL_MSG_RECV_V3 response correctly", () => {
                const snrRaw = 60; // SNR = 60/4 = 15
                const channelIdx = 5;
                const pathLen = 10;
                const txtType = 4;
                const senderTimestamp = 1769465771;
                const text = "V3 Channel message";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CHANNEL_MSG_RECV_V3]),
                    Buffer.from([snrRaw]),
                    Buffer.from([0x00, 0x00]), // 2 reserved bytes
                    Buffer.from([channelIdx]),
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 7);

                const result = command.fromBuffer(buffer);

                expect(result).toEqual({
                    code: ResponseCode.CHANNEL_MSG_RECV_V3,
                    snr: 15,
                    channel_idx: channelIdx,
                    path_len: pathLen,
                    txt_type: txtType,
                    sender_timestamp: senderTimestamp,
                    text: text,
                });
            });

            it("should handle path_len of 0xff as -1 (direct message)", () => {
                const snrRaw = 40;
                const channelIdx = 2;
                const pathLen = 0xff;
                const txtType = 1;
                const senderTimestamp = 1769465771;
                const text = "Test";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CHANNEL_MSG_RECV_V3]),
                    Buffer.from([snrRaw]),
                    Buffer.from([0x00, 0x00]),
                    Buffer.from([channelIdx]),
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 7);

                const result = command.fromBuffer(buffer);

                expect(result).toMatchObject({
                    path_len: -1,
                });
            });

            it("should calculate SNR correctly", () => {
                const snrRaw = 100; // SNR = 100/4 = 25
                const channelIdx = 1;
                const pathLen = 1;
                const txtType = 1;
                const senderTimestamp = 1769465771;
                const text = "Test";

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CHANNEL_MSG_RECV_V3]),
                    Buffer.from([snrRaw]),
                    Buffer.from([0x00, 0x00]),
                    Buffer.from([channelIdx]),
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                    Buffer.from(text, "utf8"),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 7);

                const result = command.fromBuffer(buffer);

                expect(result).toMatchObject({
                    snr: 25,
                });
            });
        });

        describe("NO_MORE_MESSAGES", () => {
            it("should handle NO_MORE_MESSAGES response", () => {
                const buffer = Buffer.from([ResponseCode.NO_MORE_MESSAGES]);

                const result = command.fromBuffer(buffer);

                expect(result).toBeUndefined();
            });
        });

        describe("error cases", () => {
            it("should throw error for invalid response code", () => {
                const invalidCode = 0x99;
                const buffer = Buffer.from([invalidCode]);

                expect(() => command.fromBuffer(buffer)).toThrow();
            });

            it("should handle empty text", () => {
                const channelIdx = 1;
                const pathLen = 1;
                const txtType = 1;
                const senderTimestamp = 1769465771;

                const buffer = Buffer.concat([
                    Buffer.from([ResponseCode.CHANNEL_MSG_RECV]),
                    Buffer.from([channelIdx]),
                    Buffer.from([pathLen]),
                    Buffer.from([txtType]),
                    Buffer.alloc(4),
                ]);

                buffer.writeUInt32LE(senderTimestamp, 4);

                const result = command.fromBuffer(buffer);

                expect(result).toMatchObject({
                    text: "",
                });
            });
        });
    });
});
