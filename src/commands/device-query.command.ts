import { CommandCode } from "./enums/command-codes";
import { ResponseCode } from "./enums/response-codes";
import { Command } from "./command";
import { BinaryReader } from "../utils/binary-reader";

/**
 * Device Query command
 */
export class DeviceQueryCommand extends Command {
    constructor(private appVersion: number = 3) {
        super();
    }

    readonly commandCode = CommandCode.DEVICE_QUERY;
    readonly expectedResponseCodes = [ResponseCode.DEVICE_INFO];

    /**
     * Serialize DEVICE_QUERY command to buffer
     * @returns {Buffer} The serialized command buffer
     */
    toBuffer(): Buffer {
        return Buffer.concat([
            Buffer.from([CommandCode.DEVICE_QUERY, this.appVersion]),
        ]);
    }

    /**
     * Parses incoming an incoming JSON command, ready for transmission to the radio
     * @param data - JSON command
     */
    fromJSON(data: string): Buffer {
        throw new Error(`${this.commandCode} cannot be parsed.`);
    }

    /**
     * Parse DEVICE_INFO response from buffer
     * @param data
     * @returns {object} Parsed DEVICE_INFO data
     */
    fromBuffer(data: Buffer): object {
        const r = new BinaryReader(data);

        const code = r.u8();
        this.validateResponseCode(code);

        const firmwarVersion = r.u8();
        const maxContactsDiv2 = r.u8();
        const maxChannels = r.u8();
        const blePin = r.u32le();
        const firmwareBuildDate = r.asciiChars(12);
        const manufacturerModel = r.asciiChars(40);
        const semanticVersion = r.asciiChars(20);

        return {
            code: ResponseCode.DEVICE_INFO,
            firmware_ver: firmwarVersion,
            max_contacts_div2: maxContactsDiv2,
            max_channels: maxChannels,
            ble_pin: blePin,
            firmware_build_date: firmwareBuildDate,
            manufacturer_model: manufacturerModel,
            semantic_version: semanticVersion,
        };
    }
}
