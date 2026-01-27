import { describe, it, expect } from "vitest";
import {
    GetBatteryAndStorageCommand,
    BattAndStorageResponse,
} from "../../../src/commands/device/get-battery-and-storage.command";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

describe("GetBatteryAndStorageCommand", () => {
    describe("static properties", () => {
        it("should have correct type", () => {
            expect(GetBatteryAndStorageCommand.type).toBe(
                "get_battery_and_storage"
            );
        });
    });

    describe("instance properties", () => {
        it("should have correct command code", () => {
            const command = new GetBatteryAndStorageCommand();
            expect(command.commandCode).toBe(CommandCode.GET_BATT_AND_STORAGE);
        });

        it("should expect BATT_AND_STORAGE response", () => {
            const command = new GetBatteryAndStorageCommand();
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.BATT_AND_STORAGE,
            ]);
        });
    });

    describe("toBuffer", () => {
        it("should serialise command correctly", () => {
            const command = new GetBatteryAndStorageCommand();
            const buffer = command.toBuffer();

            expect(buffer.length).toBe(1);
            expect(buffer[0]).toBe(CommandCode.GET_BATT_AND_STORAGE);
        });

        it("should produce consistent output on multiple calls", () => {
            const command = new GetBatteryAndStorageCommand();
            const buffer1 = command.toBuffer();
            const buffer2 = command.toBuffer();

            expect(buffer1).toEqual(buffer2);
        });
    });

    describe("fromBuffer", () => {
        it("should deserialise valid response correctly", () => {
            const command = new GetBatteryAndStorageCommand();

            // Build a mock BATT_AND_STORAGE response buffer
            const buffer = Buffer.alloc(11);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, offset++); // code
            buffer.writeUInt16LE(4200, offset); // milliVolts (4.2V)
            offset += 2;
            buffer.writeUInt32LE(512, offset); // usedKb
            offset += 4;
            buffer.writeUInt32LE(4096, offset); // totalKb

            const response = command.fromBuffer(
                buffer
            ) as BattAndStorageResponse;

            expect(response.code).toBe(ResponseCode.BATT_AND_STORAGE);
            expect(response.milli_volts).toBe(4200);
            expect(response.used_kb).toBe(512);
            expect(response.total_kb).toBe(4096);
        });

        it("should handle zero values", () => {
            const command = new GetBatteryAndStorageCommand();

            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(0, 1);
            buffer.writeUInt32LE(0, 3);
            buffer.writeUInt32LE(0, 7);

            const response = command.fromBuffer(
                buffer
            ) as BattAndStorageResponse;

            expect(response.milli_volts).toBe(0);
            expect(response.used_kb).toBe(0);
            expect(response.total_kb).toBe(0);
        });

        it("should handle maximum u16 milliVolts", () => {
            const command = new GetBatteryAndStorageCommand();

            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(65535, 1); // max u16
            buffer.writeUInt32LE(1000, 3);
            buffer.writeUInt32LE(2000, 7);

            const response = command.fromBuffer(
                buffer
            ) as BattAndStorageResponse;

            expect(response.milli_volts).toBe(65535);
        });

        it("should handle maximum u32 storage values", () => {
            const command = new GetBatteryAndStorageCommand();

            const buffer = Buffer.alloc(11);
            buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
            buffer.writeUInt16LE(3700, 1);
            buffer.writeUInt32LE(4294967295, 3); // max u32
            buffer.writeUInt32LE(4294967295, 7); // max u32

            const response = command.fromBuffer(
                buffer
            ) as BattAndStorageResponse;

            expect(response.used_kb).toBe(4294967295);
            expect(response.total_kb).toBe(4294967295);
        });

        it("should handle typical battery voltage values", () => {
            const command = new GetBatteryAndStorageCommand();

            // Test various realistic battery voltages
            const testCases = [
                { mv: 3000, desc: "low battery (3.0V)" },
                { mv: 3700, desc: "medium battery (3.7V)" },
                { mv: 4200, desc: "full battery (4.2V)" },
            ];

            for (const tc of testCases) {
                const buffer = Buffer.alloc(11);
                buffer.writeUInt8(ResponseCode.BATT_AND_STORAGE, 0);
                buffer.writeUInt16LE(tc.mv, 1);
                buffer.writeUInt32LE(100, 3);
                buffer.writeUInt32LE(1000, 7);

                const response = command.fromBuffer(
                    buffer
                ) as BattAndStorageResponse;
                expect(response.milli_volts).toBe(tc.mv);
            }
        });

        it("should throw on unexpected response code", () => {
            const command = new GetBatteryAndStorageCommand();
            const buffer = Buffer.from([ResponseCode.ERR]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });

        it("should throw on OK response code (wrong response)", () => {
            const command = new GetBatteryAndStorageCommand();
            const buffer = Buffer.from([ResponseCode.OK]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });

        it("should throw on DEVICE_INFO response code (wrong response)", () => {
            const command = new GetBatteryAndStorageCommand();
            const buffer = Buffer.from([ResponseCode.DEVICE_INFO]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });
    });
});
