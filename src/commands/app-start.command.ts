import { CommandCode } from "./enums/command-codes";
import { ResponseCode } from "./enums/response-codes";
import { Command } from "./command";
import { BinaryReader } from "../utils/binary-reader";

/**
 * App start command
 */
export class AppStartCommand extends Command {
    constructor(
        private appVersion: number = 3,
        private appName: string = "MeshCore-MQTT-Bridge"
    ) {
        super();
    }

    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.SELF_INFO];

    /**
     * Serialize APP_START command to buffer
     * @returns {Buffer} The serialized command buffer
     */
    toBuffer(): Buffer {
        return Buffer.concat([
            Buffer.from([CommandCode.APP_START, this.appVersion]),
            Buffer.alloc(6), // reserved
            Buffer.from(this.appName, "utf8"),
        ]);
    }

    /**
     * Parse SELF_INFO response from buffer
     * @param data
     * @returns {object} Parsed SELF_INFO data
     */
    fromBuffer(data: Buffer): object {
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
