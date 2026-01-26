import { describe, it, expect } from "vitest";
import { DeviceQueryCommand } from "../../src/commands/device-query.command";
import { CommandCode } from "../../src/commands/enums/command-codes";
import { ResponseCode } from "../../src/commands/enums/response-codes";

describe("DeviceQueryCommand", () => {
    describe("toBuffer", () => {
        it("should serialise with default values", () => {
            const command = new DeviceQueryCommand();
            const buffer = command.toBuffer();

            expect(buffer[0]).toBe(CommandCode.DEVICE_QUERY);
            expect(buffer[1]).toBe(3); // default appVersion
        });

        it("should serialise with custom values", () => {
            const command = new DeviceQueryCommand(1);
            const buffer = command.toBuffer();

            expect(buffer[0]).toBe(CommandCode.DEVICE_QUERY);
            expect(buffer[1]).toBe(1);
        });

        it("should have correct total length", () => {
            const command = new DeviceQueryCommand(3);
            const buffer = command.toBuffer();

            // 1 (command) + 1 (version)
            expect(buffer.length).toBe(2);
        });
    });

    describe("fromBuffer", () => {
        it("should deserialise DEVICE_INFO response", () => {
            const blePin = Buffer.alloc(4);
            blePin.writeUInt32LE(0); // 0 for this test

            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.DEVICE_INFO]), // code
                Buffer.from([8]), // firmwareVersion
                Buffer.from([175]), // maxContactsDiv2
                Buffer.from([40]), // maxChannels
                blePin, // 4-byte blePin
                Buffer.from("23 Jan 2026".padEnd(12, "\0"), "ascii"), // firmwareBuildDate (12 bytes)
                Buffer.from("Heltec V3".padEnd(40, "\0"), "ascii"), // manufacturerModel (40 bytes)
                Buffer.from("v1.11.0_dev-3c27132".padEnd(20, "\0"), "ascii"), // semanticVersion (20 bytes)
            ]);

            const command = new DeviceQueryCommand();
            const parsed = command.fromBuffer(buffer) as any;

            expect(parsed.code).toBe(ResponseCode.DEVICE_INFO);
            expect(parsed.firmware_ver).toBe(8);
            expect(parsed.max_contacts_div2).toBe(175);
            expect(parsed.max_channels).toBe(40);
            expect(parsed.ble_pin).toBe(0);
            expect(parsed.firmware_build_date).toBe("23 Jan 2026");
            expect(parsed.manufacturer_model.trim()).toBe("Heltec V3");
            expect(parsed.semantic_version.trim()).toBe("v1.11.0_dev-3c27132");
        });

        it("should throw on unexpected response code", () => {
            const buffer = Buffer.from([0xff]); // Invalid response code

            const command = new DeviceQueryCommand();
            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code: 0xff"
            );
        });
    });

    describe("command properties", () => {
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
});
