import { CommandCode } from "../enums/command-codes";
import { ParameterisedCommand } from "../base/command";
import { BinaryReader } from "../../utils/binary-reader";
import * as z from "zod";
import { ResponseCode } from "../enums/response-codes";
import { commandRegistry } from "../base/registry";

export interface DeviceInfoResponse {
    code: ResponseCode;
    firmware_ver: number;
    max_contacts_div_2: number;
    max_channels: number;
    ble_pin: number;
    firmware_build_date: string;
    manufacturer_model: string;
    semantic_version: string;
}

/**
 * Device Query command
 * Should be first command app sends after establishing connection.
 * Queries device for firmware version, capabilities, and hardware info.
 */
export class DeviceQueryCommand extends ParameterisedCommand {
    static readonly type = "device_query";

    readonly commandCode = CommandCode.DEVICE_QUERY;
    readonly expectedResponseCodes = [ResponseCode.DEVICE_INFO];

    readonly commandSchema = z.object({
        appTargetVer: z.number().int().min(1).max(255).default(3),
    });

    private params?: z.infer<typeof this.commandSchema>;

    constructor(appTargetVer: number = 3) {
        super();
        this.params = this.commandSchema.parse({ appTargetVer });
    }

    fromJSON(data: unknown): this {
        this.params = this.commandSchema.parse(data);
        return this;
    }

    toBuffer(): Buffer {
        if (!this.params) {
            throw new Error("Command not initialized - call fromJSON first");
        }

        return Buffer.from([
            CommandCode.DEVICE_QUERY,
            this.params.appTargetVer,
        ]);
    }

    fromBuffer(data: Buffer): DeviceInfoResponse {
        const r = new BinaryReader(data);
        const code = r.u8();
        this.validateResponseCode(code);

        return {
            code,
            firmware_ver: r.u8(),
            max_contacts_div_2: r.u8(),
            max_channels: r.u8(),
            ble_pin: r.u32le(),
            firmware_build_date: r.asciiChars(12),
            manufacturer_model: r.asciiChars(40),
            semantic_version: r.asciiChars(20),
        };
    }
}

commandRegistry.register(DeviceQueryCommand);
