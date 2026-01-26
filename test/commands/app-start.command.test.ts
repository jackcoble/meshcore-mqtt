import { describe, it, expect } from "vitest";
import { AppStartCommand } from "../../src/commands/app-start.command";
import { CommandCode } from "../../src/commands/enums/command-codes";
import { ResponseCode } from "../../src/commands/enums/response-codes";

describe("AppStartCommand", () => {
    describe("toBuffer", () => {
        it("should serialize with default values", () => {
            const command = new AppStartCommand();
            const buffer = command.toBuffer();

            expect(buffer[0]).toBe(CommandCode.APP_START);
            expect(buffer[1]).toBe(3); // default appVersion
            expect(buffer.subarray(2, 8)).toEqual(Buffer.alloc(6)); // reserved bytes
            expect(buffer.subarray(8).toString("utf8")).toBe(
                "MeshCore-MQTT-Bridge"
            );
        });

        it("should serialize with custom values", () => {
            const command = new AppStartCommand(3, "CustomApp");
            const buffer = command.toBuffer();

            expect(buffer[0]).toBe(CommandCode.APP_START);
            expect(buffer[1]).toBe(3);
            expect(buffer.subarray(2, 8)).toEqual(Buffer.alloc(6));
            expect(buffer.subarray(8).toString("utf8")).toBe("CustomApp");
        });

        it("should have correct total length", () => {
            const appName = "TestApp";
            const command = new AppStartCommand(1, appName);
            const buffer = command.toBuffer();

            // 1 (command) + 1 (version) + 6 (reserved) + appName length
            expect(buffer.length).toBe(8 + appName.length);
        });
    });

    describe("fromBuffer", () => {
        it("should deserialize SELF_INFO response", () => {
            const publicKey = Buffer.alloc(32, 0xab);
            const name = "TestNode";

            // Helper to create little-endian i32 buffer
            const i32le = (val: number): Buffer => {
                const buf = Buffer.alloc(4);
                buf.writeInt32LE(val, 0);
                return buf;
            };

            // Helper to create little-endian u32 buffer
            const u32le = (val: number): Buffer => {
                const buf = Buffer.alloc(4);
                buf.writeUInt32LE(val, 0);
                return buf;
            };

            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.SELF_INFO]), // code
                Buffer.from([1]), // nodeType
                Buffer.from([22]), // txPowerDbm
                Buffer.from([22]), // maxTxPower
                publicKey, // 32-byte public key
                i32le(1000000), // advLat: 1000000 -> 1.0
                i32le(2000000), // advLon: 2000000 -> 2.0
                Buffer.from([1]), // multiAcks: true
                Buffer.from([0]), // advertLocPolicy
                Buffer.from([1]), // telemetryModes
                Buffer.from([1]), // manualAddContacts: true
                u32le(915000000), // radioFreq: 915000000 -> 915000
                u32le(125000), // radioBw: 125000 -> 125
                Buffer.from([12]), // radioSf
                Buffer.from([5]), // radioCr
                Buffer.from(name, "utf8"), // name
            ]);

            const command = new AppStartCommand();
            const result = command.fromBuffer(buffer);

            expect(result).toEqual({
                code: ResponseCode.SELF_INFO,
                type: 1,
                tx_power_dbm: 22,
                max_tx_power: 22,
                public_key: publicKey.toString("hex"),
                adv_lat: 1.0,
                adv_lon: 2.0,
                multi_acks: true,
                advert_loc_policy: 0,
                telemetry_modes: 1,
                manual_add_contacts: true,
                radio_freq: 915000,
                radio_bw: 125,
                radio_sf: 12,
                radio_cr: 5,
                name: "TestNode",
            });
        });

        it("should throw on unexpected response code", () => {
            const buffer = Buffer.concat([
                Buffer.from([ResponseCode.OK]), // wrong response code
                Buffer.alloc(50), // padding
            ]);

            const command = new AppStartCommand();

            expect(() => command.fromBuffer(buffer)).toThrow(
                /Unexpected response code/
            );
        });
    });

    describe("command properties", () => {
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
});
