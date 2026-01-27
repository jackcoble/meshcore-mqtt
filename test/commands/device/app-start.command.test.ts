import { describe, it, expect } from "vitest";
import { AppStartCommand, SelfInfoResponse } from "../../../src/commands";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

describe("AppStartCommand", () => {
    describe("static properties", () => {
        it("should have correct command type", () => {
            expect(AppStartCommand.type).toBe("app_start");
        });
    });

    describe("instance properties", () => {
        it("should have correct command code", () => {
            const command = new AppStartCommand();
            expect(command.commandCode).toBe(CommandCode.APP_START);
        });

        it("should expect SELF_INFO response", () => {
            const command = new AppStartCommand();
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.SELF_INFO,
            ]);
        });
    });

    describe("constructor", () => {
        it("should use default values when no arguments provided", () => {
            const command = new AppStartCommand();
            const buffer = command.toBuffer();
            expect(buffer[0]).toBe(CommandCode.APP_START);
            expect(buffer[1]).toBe(3); // default appVersion
        });

        it("should accept custom appVersion", () => {
            const command = new AppStartCommand(2);
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(2);
        });

        it("should accept custom appName", () => {
            const command = new AppStartCommand(3, "CustomApp");
            const buffer = command.toBuffer();
            const appNamePart = buffer.subarray(8).toString("utf8");
            expect(appNamePart).toBe("CustomApp");
        });
    });

    describe("fromJSON", () => {
        it("should parse valid JSON with all parameters", () => {
            const command = new AppStartCommand();
            command.fromJSON({ appVersion: 2, appName: "TestApp" });
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(2);
            expect(buffer.subarray(8).toString("utf8")).toBe("TestApp");
        });

        it("should use defaults for missing parameters", () => {
            const command = new AppStartCommand();
            command.fromJSON({});
            const buffer = command.toBuffer();
            expect(buffer[1]).toBe(3);
            expect(buffer.subarray(8).toString("utf8")).toBe(
                "MeshCore-MQTT-Bridge"
            );
        });

        it("should throw on invalid appVersion (too low)", () => {
            const command = new AppStartCommand();
            expect(() => command.fromJSON({ appVersion: 0 })).toThrow();
        });

        it("should throw on invalid appVersion (too high)", () => {
            const command = new AppStartCommand();
            expect(() => command.fromJSON({ appVersion: 4 })).toThrow();
        });

        it("should throw on appName exceeding max length", () => {
            const command = new AppStartCommand();
            const longName = "a".repeat(31);
            expect(() => command.fromJSON({ appName: longName })).toThrow();
        });

        it("should return this for chaining", () => {
            const command = new AppStartCommand();
            const result = command.fromJSON({});
            expect(result).toBe(command);
        });
    });

    describe("toBuffer", () => {
        it("should serialise command correctly", () => {
            const command = new AppStartCommand(3, "TestApp");
            const buffer = command.toBuffer();

            expect(buffer[0]).toBe(CommandCode.APP_START);
            expect(buffer[1]).toBe(3); // appVersion
            // bytes 2-7 are reserved (6 bytes of zeros)
            expect(buffer.subarray(2, 8)).toEqual(Buffer.alloc(6));
            expect(buffer.subarray(8).toString("utf8")).toBe("TestApp");
        });

        it("should have correct total length", () => {
            const appName = "Test";
            const command = new AppStartCommand(3, appName);
            const buffer = command.toBuffer();
            // 1 (command) + 1 (version) + 6 (reserved) + appName length
            expect(buffer.length).toBe(8 + appName.length);
        });
    });

    describe("fromBuffer", () => {
        it("should deserialise valid response correctly", () => {
            const command = new AppStartCommand();

            // Build a mock SELF_INFO response buffer
            const buffer = Buffer.alloc(70);
            let offset = 0;

            buffer.writeUInt8(ResponseCode.SELF_INFO, offset++); // code
            buffer.writeUInt8(1, offset++); // nodeType
            buffer.writeUInt8(20, offset++); // txPowerDbm
            buffer.writeUInt8(30, offset++); // maxTxPower
            // publicKey (32 bytes)
            Buffer.from("a".repeat(32), "utf8").copy(buffer, offset);
            offset += 32;
            buffer.writeInt32LE(40123456, offset); // advLat (40.123456 * 1e6)
            offset += 4;
            buffer.writeInt32LE(-74654321, offset); // advLon (-74.654321 * 1e6)
            offset += 4;
            buffer.writeUInt8(1, offset++); // multiAcks
            buffer.writeUInt8(2, offset++); // advertLocPolicy
            buffer.writeUInt8(3, offset++); // telemetryModes
            buffer.writeUInt8(0, offset++); // manualAddContacts
            buffer.writeUInt32LE(915000000, offset); // radioFreq (915 MHz * 1000)
            offset += 4;
            buffer.writeUInt32LE(125000, offset); // radioBw (125 kHz * 1000)
            offset += 4;
            buffer.writeUInt8(10, offset++); // radioSf
            buffer.writeUInt8(5, offset++); // radioCr
            // name (rest of buffer)
            Buffer.from("TestNode", "utf8").copy(buffer, offset);

            const response = command.fromBuffer(
                buffer.subarray(0, offset + 8)
            ) as SelfInfoResponse;

            expect(response.code).toBe(ResponseCode.SELF_INFO);
            expect(response.type).toBe(1);
            expect(response.tx_power_dbm).toBe(20);
            expect(response.max_tx_power).toBe(30);
            expect(response.public_key).toBe(
                Buffer.from("a".repeat(32), "utf8").toString("hex")
            );
            expect(response.adv_lat).toBeCloseTo(40.123456, 5);
            expect(response.adv_lon).toBeCloseTo(-74.654321, 5);
            expect(response.multi_acks).toBe(true);
            expect(response.advert_loc_policy).toBe(2);
            expect(response.telemetry_modes).toBe(3);
            expect(response.manual_add_contacts).toBe(false);
            expect(response.radio_freq).toBe(915000);
            expect(response.radio_bw).toBe(125);
            expect(response.radio_sf).toBe(10);
            expect(response.radio_cr).toBe(5);
            expect(response.name).toBe("TestNode");
        });

        it("should throw on unexpected response code", () => {
            const command = new AppStartCommand();
            const buffer = Buffer.from([ResponseCode.ERR]);

            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });
    });
});
