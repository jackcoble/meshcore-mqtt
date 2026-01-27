import { CommandCode } from "../enums/command-codes";
import { ResponseCode } from "../enums/response-codes";
import { ParameterisedCommand } from "../base/command";
import { BinaryReader } from "../../utils/binary-reader";
import * as z from "zod";
import { commandRegistry } from "../base/registry";

export interface SelfInfoResponse {
    code: number;
    type: number;
    tx_power_dbm: number;
    max_tx_power: number;
    public_key: string;
    adv_lat: number;
    adv_lon: number;
    multi_acks: boolean;
    advert_loc_policy: number;
    telemetry_modes: number;
    manual_add_contacts: boolean;
    radio_freq: number;
    radio_bw: number;
    radio_sf: number;
    radio_cr: number;
    name: string;
}

/**
 * App start command
 */
export class AppStartCommand extends ParameterisedCommand {
    static readonly type = "app_start";

    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.SELF_INFO];

    readonly commandSchema = z.object({
        appVersion: z.number().int().min(1).max(3).default(3),
        appName: z.string().max(30).default("MeshCore-MQTT-Bridge"),
    });

    private params?: z.infer<typeof this.commandSchema>;

    constructor(
        appVersion: number = 3,
        appName: string = "MeshCore-MQTT-Bridge"
    ) {
        super();
        this.params = this.commandSchema.parse({ appVersion, appName });
    }

    fromJSON(data: unknown): this {
        this.params = this.commandSchema.parse(data);
        return this;
    }

    toBuffer(): Buffer {
        if (!this.params) {
            throw new Error("Command not initialized - call fromJSON first");
        }

        return Buffer.concat([
            Buffer.from([CommandCode.APP_START, this.params.appVersion]),
            Buffer.alloc(6), // reserved
            Buffer.from(this.params.appName, "utf8"),
        ]);
    }

    fromBuffer(data: Buffer): SelfInfoResponse {
        const r = new BinaryReader(data);

        const code = r.u8();
        this.validateResponseCode(code);

        const nodeType = r.u8();
        const txPowerDbm = r.u8();
        const maxTxPower = r.u8();
        const publicKey = r.bytes(32).toString("hex");

        const advLat = r.i32le() / 1e6;
        const advLon = r.i32le() / 1e6;

        const multiAcks = !!r.u8();
        const advertLocPolicy = r.u8();
        const telemetryModes = r.u8();
        const manualAddContacts = !!r.u8();

        const radioFreq = r.u32le() / 1000;
        const radioBw = r.u32le() / 1000;
        const radioSf = r.u8();
        const radioCr = r.u8();

        const name = r.restUtf8();

        return {
            code: ResponseCode.SELF_INFO,
            type: nodeType,
            tx_power_dbm: txPowerDbm,
            max_tx_power: maxTxPower,
            public_key: publicKey,
            adv_lat: advLat,
            adv_lon: advLon,
            multi_acks: multiAcks,
            advert_loc_policy: advertLocPolicy,
            telemetry_modes: telemetryModes,
            manual_add_contacts: manualAddContacts,
            radio_freq: radioFreq,
            radio_bw: radioBw,
            radio_sf: radioSf,
            radio_cr: radioCr,
            name: name,
        };
    }
}

commandRegistry.register(AppStartCommand);
