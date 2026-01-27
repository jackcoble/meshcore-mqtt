import { describe, it, expect, beforeEach } from "vitest";
import {
    GetBatteryAndStorageCommand,
    CommandCode,
    ResponseCode,
} from "../../src/commands";

describe("GetBatteryAndStorageCommand", () => {
    let command: GetBatteryAndStorageCommand;

    beforeEach(() => {
        command = new GetBatteryAndStorageCommand();
    });

    describe("constructor", () => {
        it("should create an instance", () => {
            expect(command).toBeInstanceOf(GetBatteryAndStorageCommand);
        });

        it("should set the correct command code", () => {
            expect(command.commandCode).toBe(CommandCode.GET_BATT_AND_STORAGE);
        });

        it("should set the correct expected response codes", () => {
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.BATT_AND_STORAGE,
            ]);
        });
    });

    describe("toBuffer", () => {
        it("should serialise to a buffer with the correct command code", () => {
            const buffer = command.toBuffer();

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBe(1);
            expect(buffer[0]).toBe(CommandCode.GET_BATT_AND_STORAGE);
        });

        it("should create a new buffer each time", () => {
            const buffer1 = command.toBuffer();
            const buffer2 = command.toBuffer();

            expect(buffer1).not.toBe(buffer2);
            expect(buffer1.equals(buffer2)).toBe(true);
        });
    });

    describe("fromBuffer", () => {
        it("should parse a valid response buffer correctly", () => {
            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(3700, 1);
            buffer.writeUInt32LE(1024, 3);
            buffer.writeUInt32LE(8192, 7);

            const result = command.fromBuffer(buffer);

            expect(result).toEqual({
                code: ResponseCode.BATT_AND_STORAGE,
                milli_volts: 3700,
                used_kb: 1024,
                total_kb: 8192,
            });
        });

        it("should parse zero values correctly", () => {
            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(0, 1);
            buffer.writeUInt32LE(0, 3);
            buffer.writeUInt32LE(0, 7);

            const result = command.fromBuffer(buffer);

            expect(result).toEqual({
                code: ResponseCode.BATT_AND_STORAGE,
                milli_volts: 0,
                used_kb: 0,
                total_kb: 0,
            });
        });

        it("should parse maximum values correctly", () => {
            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(65535, 1);
            buffer.writeUInt32LE(4294967295, 3);
            buffer.writeUInt32LE(4294967295, 7);

            const result = command.fromBuffer(buffer);

            expect(result).toEqual({
                code: ResponseCode.BATT_AND_STORAGE,
                milli_volts: 65535,
                used_kb: 4294967295,
                total_kb: 4294967295,
            });
        });

        it("should throw error for invalid response code", () => {
            const invalidCode = 0x99;
            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(invalidCode, 0);
            buffer.writeUInt16LE(3700, 1);
            buffer.writeUInt32LE(1024, 3);
            buffer.writeUInt32LE(8192, 7);

            expect(() => command.fromBuffer(buffer)).toThrow();
        });

        it("should handle real-world battery values", () => {
            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(4200, 1);
            buffer.writeUInt32LE(512000, 3);
            buffer.writeUInt32LE(1048576, 7);

            const result = command.fromBuffer(buffer);

            expect(result).toEqual({
                code: ResponseCode.BATT_AND_STORAGE,
                milli_volts: 4200,
                used_kb: 512000,
                total_kb: 1048576,
            });
        });
    });
});
