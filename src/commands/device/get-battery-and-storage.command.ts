import { CommandCode } from "../enums/command-codes";
import { ResponseCode } from "../enums/response-codes";
import { Command } from "../base/command";
import { BinaryReader } from "../../utils/binary-reader";
import { commandRegistry } from "../base/registry";

export interface BattAndStorageResponse {
    code: number;
    milli_volts: number;
    used_kb: number;
    total_kb: number;
}

/**
 * Get Battery and Storage command
 */
export class GetBatteryAndStorageCommand extends Command {
    static readonly type = "get_battery_and_storage";

    constructor() {
        super();
    }

    readonly commandCode = CommandCode.GET_BATT_AND_STORAGE;
    readonly expectedResponseCodes = [ResponseCode.BATT_AND_STORAGE];

    toBuffer(): Buffer {
        return Buffer.concat([Buffer.from([CommandCode.GET_BATT_AND_STORAGE])]);
    }

    fromBuffer(data: Buffer): BattAndStorageResponse {
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

commandRegistry.register(GetBatteryAndStorageCommand);
