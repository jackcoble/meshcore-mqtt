import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SendChannelTextMessageCommand } from "../../../src/commands/messaging/send-channel-text-message.command";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

const SYSTEM_TIME = new Date("2026-01-27T12:00:00Z");

describe("SendChannelTextMessageCommand", () => {
    describe("static properties", () => {
        it("should have correct type", () => {
            expect(SendChannelTextMessageCommand.type).toBe(
                "send_channel_text_message"
            );
        });
    });

    describe("instance properties", () => {
        it("should have correct command code", () => {
            const command = new SendChannelTextMessageCommand();
            expect(command.commandCode).toBe(CommandCode.SEND_CHANNEL_TXT_MSG);
        });

        it("should expect OK or ERR response", () => {
            const command = new SendChannelTextMessageCommand();
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.OK,
                ResponseCode.ERR,
            ]);
        });
    });

    describe("fromJSON", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(SYSTEM_TIME);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should parse valid JSON with all parameters", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({
                text: "Hello, world!",
                txtType: 1,
                channelIdx: 2,
                senderTimestamp: 1705320000,
            });

            const buffer = command.toBuffer();

            expect(buffer[0]).toBe(CommandCode.SEND_CHANNEL_TXT_MSG);
            expect(buffer[1]).toBe(1); // txtType
            expect(buffer[2]).toBe(2); // channelIdx
            expect(buffer.readUInt32LE(3)).toBe(1705320000); // senderTimestamp
            expect(buffer.subarray(7).toString("utf8")).toBe("Hello, world!");
        });

        it("should use default txtType of 0 (PLAIN)", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Test" });

            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(0);
        });

        it("should use default channelIdx of 0 (Public)", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Test" });

            const buffer = command.toBuffer();
            expect(buffer[2]).toBe(0);
        });

        it("should use current timestamp as default senderTimestamp", () => {
            const command = new SendChannelTextMessageCommand();
            const expectedTimestamp = Math.floor(Date.now() / 1000);

            command.fromJSON({ text: "Test" });

            const buffer = command.toBuffer();
            const actualTimestamp = buffer.readUInt32LE(3);

            expect(actualTimestamp).toBe(expectedTimestamp);
        });

        it("should throw on txtType below minimum", () => {
            const command = new SendChannelTextMessageCommand();
            expect(() =>
                command.fromJSON({ text: "Test", txtType: -1 })
            ).toThrow();
        });

        it("should throw on txtType above maximum", () => {
            const command = new SendChannelTextMessageCommand();
            expect(() =>
                command.fromJSON({ text: "Test", txtType: 256 })
            ).toThrow();
        });

        it("should throw on channelIdx below minimum", () => {
            const command = new SendChannelTextMessageCommand();
            expect(() =>
                command.fromJSON({ text: "Test", channelIdx: -1 })
            ).toThrow();
        });

        it("should throw on channelIdx above maximum", () => {
            const command = new SendChannelTextMessageCommand();
            expect(() =>
                command.fromJSON({ text: "Test", channelIdx: 256 })
            ).toThrow();
        });

        it("should throw on text exceeding max length", () => {
            const command = new SendChannelTextMessageCommand();
            const longText = "a".repeat(161);
            expect(() => command.fromJSON({ text: longText })).toThrow();
        });

        it("should accept text at max length", () => {
            const command = new SendChannelTextMessageCommand();
            const maxText = "a".repeat(160);
            command.fromJSON({ text: maxText });

            const buffer = command.toBuffer();
            expect(buffer.subarray(7).toString("utf8")).toBe(maxText);
        });

        it("should throw on negative senderTimestamp", () => {
            const command = new SendChannelTextMessageCommand();
            expect(() =>
                command.fromJSON({ text: "Test", senderTimestamp: -1 })
            ).toThrow();
        });

        it("should return this for chaining", () => {
            const command = new SendChannelTextMessageCommand();
            const result = command.fromJSON({ text: "Test" });
            expect(result).toBe(command);
        });
    });

    describe("toBuffer", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(SYSTEM_TIME);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should throw if command not initialised", () => {
            const command = new SendChannelTextMessageCommand();
            expect(() => command.toBuffer()).toThrow(
                "Command not initialised - call fromJSON first"
            );
        });

        it("should serialise command correctly", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({
                text: "Hello",
                txtType: 0,
                channelIdx: 1,
                senderTimestamp: 1705320000,
            });

            const buffer = command.toBuffer();

            // Header: 1 (command) + 1 (txtType) + 1 (channelIdx) + 4 (timestamp) = 7
            expect(buffer.length).toBe(7 + 5); // header + "Hello"
            expect(buffer[0]).toBe(CommandCode.SEND_CHANNEL_TXT_MSG);
            expect(buffer[1]).toBe(0); // txtType
            expect(buffer[2]).toBe(1); // channelIdx
            expect(buffer.readUInt32LE(3)).toBe(1705320000);
            expect(buffer.subarray(7).toString("utf8")).toBe("Hello");
        });

        it("should handle UTF-8 text correctly", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Hello 世界" });

            const buffer = command.toBuffer();
            expect(buffer.subarray(7).toString("utf8")).toBe("Hello 世界");
        });

        it("should handle emoji text correctly", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Test 🚀" });

            const buffer = command.toBuffer();
            expect(buffer.subarray(7).toString("utf8")).toBe("Test 🚀");
        });

        it("should handle empty text", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "" });

            const buffer = command.toBuffer();
            expect(buffer.length).toBe(7); // header only
            expect(buffer.subarray(7).toString("utf8")).toBe("");
        });
    });

    describe("fromBuffer", () => {
        it("should return null on OK response", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Test" });

            const buffer = Buffer.from([ResponseCode.OK]);
            const result = command.fromBuffer(buffer);

            expect(result).toBeNull();
        });

        it("should return null on ERR response", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Test" });

            const buffer = Buffer.from([ResponseCode.ERR]);
            const result = command.fromBuffer(buffer);

            expect(result).toBeNull();
        });

        it("should throw on unexpected response code", () => {
            const command = new SendChannelTextMessageCommand();
            command.fromJSON({ text: "Test" });

            const buffer = Buffer.from([ResponseCode.DEVICE_INFO]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });
    });
});
