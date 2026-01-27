import { describe, it, expect } from "vitest";
import {
    DeviceQueryCommand,
    DeviceInfoResponse,
} from "../../../src/commands/device/device-query.command";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

describe("DeviceQueryCommand", () => {
    describe("static properties", () => {
        it("should have correct type", () => {
            expect(DeviceQueryCommand.type).toBe("device_query");
        });
    });

    describe("instance properties", () => {
        it("should have correct command code", () => {
            const command = new DeviceQueryCommand();
            expect(command.commandCode).toBe(CommandCode.DEVICE_QUERY);
        });

        it("should expect DEVICE_INFO response", () => {
            const command = new DeviceQueryCommand();
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.DEVICE_INFO,
            ]);
        });
    });

    describe("constructor", () => {
        it("should use default appTargetVer of 3", () => {
            const command = new DeviceQueryCommand();
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(3);
        });

        it("should accept custom appTargetVer", () => {
            const command = new DeviceQueryCommand(1);
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(1);
        });
    });

    describe("fromJSON", () => {
        it("should parse valid JSON with appTargetVer", () => {
            const command = new DeviceQueryCommand();
            command.fromJSON({ appTargetVer: 2 });
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(2);
        });

        it("should use default for missing appTargetVer", () => {
            const command = new DeviceQueryCommand();
            command.fromJSON({});
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(3);
        });

        it("should throw on appTargetVer below minimum", () => {
            const command = new DeviceQueryCommand();
            expect(() => command.fromJSON({ appTargetVer: 0 })).toThrow();
        });

        it("should throw on appTargetVer above maximum", () => {
            const command = new DeviceQueryCommand();
            expect(() => command.fromJSON({ appTargetVer: 256 })).toThrow();
        });

        it("should throw on non-integer appTargetVer", () => {
            const command = new DeviceQueryCommand();
            expect(() => command.fromJSON({ appTargetVer: 2.5 })).toThrow();
        });

        it("should accept maximum valid appTargetVer", () => {
            const command = new DeviceQueryCommand();
            command.fromJSON({ appTargetVer: 255 });
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(255);
        });

        it("should accept minimum valid appTargetVer", () => {
            const command = new DeviceQueryCommand();
            command.fromJSON({ appTargetVer: 1 });
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(1);
        });

        it("should return this for chaining", () => {
            const command = new DeviceQueryCommand();
            const result = command.fromJSON({});
            expect(result).toBe(command);
        });
    });

    describe("toBuffer", () => {
        it("should serialise command correctly", () => {
            const command = new DeviceQueryCommand(3);
            const buffer = command.toBuffer();

            expect(buffer.length).toBe(2);
            expect(buffer[0]).toBe(CommandCode.DEVICE_QUERY);
            expect(buffer[1]).toBe(3);
        });

        it("should serialise with different appTargetVer values", () => {
            for (const ver of [1, 2, 3, 100, 255]) {
                const command = new DeviceQueryCommand(ver);
                const buffer = command.toBuffer();
                expect(buffer[1]).toBe(ver);
            }
        });
    });

    describe("fromBuffer", () => {
        it("should deserialise valid response correctly", () => {
            const command = new DeviceQueryCommand();

            // Build a mock DEVICE_INFO response buffer
            const buffer = Buffer.alloc(80);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.DEVICE_INFO, offset++); // code
            buffer.writeUInt8(3, offset++); // firmware_ver
            buffer.writeUInt8(50, offset++); // max_contacts_div_2
            buffer.writeUInt8(8, offset++); // max_channels
            buffer.writeUInt32LE(123456, offset); // ble_pin
            offset += 4;
            Buffer.from("Jan 15 2024\0", "ascii").copy(buffer, offset); // firmware_build_date (12 chars)
            offset += 12;
            const modelStr = "Heltec V3".padEnd(40, "\0");
            Buffer.from(modelStr, "ascii").copy(buffer, offset); // manufacturer_model (40 chars)
            offset += 40;
            const versionStr = "1.1.1".padEnd(20, "\0");
            Buffer.from(versionStr, "ascii").copy(buffer, offset); // semantic_version (20 chars)

            const response = command.fromBuffer(buffer) as DeviceInfoResponse;

            expect(response.code).toBe(ResponseCode.DEVICE_INFO);
            expect(response.firmware_ver).toBe(3);
            expect(response.max_contacts_div_2).toBe(50);
            expect(response.max_channels).toBe(8);
            expect(response.ble_pin).toBe(123456);
            expect(response.firmware_build_date).toBe("Jan 15 2024");
            expect(response.manufacturer_model).toBe("Heltec V3");
            expect(response.semantic_version).toBe("1.1.1");
        });

        it("should handle null-terminated strings correctly", () => {
            const command = new DeviceQueryCommand();

            const buffer = Buffer.alloc(80);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.DEVICE_INFO, offset++);
            buffer.writeUInt8(1, offset++);
            buffer.writeUInt8(25, offset++);
            buffer.writeUInt8(4, offset++);
            buffer.writeUInt32LE(0, offset);
            offset += 4;
            // Short date with null terminator
            Buffer.from("Dec 1 2023\0\0", "ascii").copy(buffer, offset);
            offset += 12;
            // Short model with null terminator
            const shortModel = "T-Beam\0".padEnd(40, "\0");
            Buffer.from(shortModel, "ascii").copy(buffer, offset);
            offset += 40;
            // Short version with null terminator
            const shortVersion = "0.1\0".padEnd(20, "\0");
            Buffer.from(shortVersion, "ascii").copy(buffer, offset);

            const response = command.fromBuffer(buffer) as DeviceInfoResponse;

            expect(response.firmware_build_date).toBe("Dec 1 2023");
            expect(response.manufacturer_model).toBe("T-Beam");
            expect(response.semantic_version).toBe("0.1");
        });

        it("should throw on unexpected response code", () => {
            const command = new DeviceQueryCommand();
            const buffer = Buffer.from([ResponseCode.ERR]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });

        it("should throw on SELF_INFO response code (wrong response)", () => {
            const command = new DeviceQueryCommand();
            const buffer = Buffer.from([ResponseCode.SELF_INFO]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });
    });
});
