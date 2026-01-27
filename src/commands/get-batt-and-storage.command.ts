import { CommandCode } from "./enums/command-codes";
import { ResponseCode } from "./enums/response-codes";
import { Command } from "./command";
import { BinaryReader } from "../utils/binary-reader";

/**
 * Get Battery and Storage command
 */
export class GetBatteryAndStorageCommand extends Command {
    constructor() {
        super();
    }

    readonly commandCode = CommandCode.GET_BATT_AND_STORAGE;
    readonly expectedResponseCodes = [ResponseCode.BATT_AND_STORAGE];

    /**
     * Serialize GET_BATT_AND_STORAGE command to buffer
     * @returns {Buffer} The serialized command buffer
     */
    toBuffer(): Buffer {
        return Buffer.concat([Buffer.from([CommandCode.GET_BATT_AND_STORAGE])]);
    }

    /**
     * Parse BATT_AND_STORAGE response from buffer
     * @param data
     * @returns {object} Parsed BATT_AND_STORAGE data
     */
    fromBuffer(data: Buffer): object {
        const r = new BinaryReader(data);

        const code = r.u8();
        this.validateResponseCode(code);

        const milliVolts = r.u16le();
        const usedKb = r.u32le();
        const totalKb = r.u32le();

        return {
            code: code,
            milli_volts: milliVolts,
            used_kb: usedKb,
            total_kb: totalKb,
        };
    }
}
