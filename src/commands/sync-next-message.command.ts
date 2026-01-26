import { CommandCode } from "./enums/command-codes";
import { ResponseCode } from "./enums/response-codes";
import { Command } from "./command";
import { BinaryReader } from "../utils/binary-reader";

/**
 * Sync Next Message command
 */
export class SyncNextMessageCommand extends Command {
    constructor() {
        super();
    }

    readonly commandCode = CommandCode.SYNC_NEXT_MESSAGE;
    readonly expectedResponseCodes = [
        ResponseCode.NO_MORE_MESSAGES,
        ResponseCode.CONTACT_MSG_RECV,
        ResponseCode.CHANNEL_MSG_RECV,
        ResponseCode.CONTACT_MSG_RECV_V3, // V3 App Client
        ResponseCode.CHANNEL_MSG_RECV_V3, // V3 App Client
    ];

    private messageResponseCode: ResponseCode;

    /**
     * Check if the message was sent directly (contact message)
     * @returns {boolean} True if message was direct/contact message
     */
    isDirectMessage(): boolean {
        return (
            this.messageResponseCode === ResponseCode.CONTACT_MSG_RECV ||
            this.messageResponseCode === ResponseCode.CONTACT_MSG_RECV_V3
        );
    }

    /**
     * Check if the message was sent via channel
     * @returns {boolean} True if message was channel message
     */
    isChannelMessage(): boolean {
        return (
            this.messageResponseCode === ResponseCode.CHANNEL_MSG_RECV ||
            this.messageResponseCode === ResponseCode.CHANNEL_MSG_RECV_V3
        );
    }

    /**
     * Serialize SYNC_NEXT_MESSAGE command to buffer
     * @returns {Buffer} The serialized command buffer
     */
    toBuffer(): Buffer {
        return Buffer.concat([Buffer.from([CommandCode.SYNC_NEXT_MESSAGE])]);
    }

    /**
     * Parse response from buffer
     * @param data
     * @returns {object} Parsed data
     */
    fromBuffer(data: Buffer): object {
        const r = new BinaryReader(data);

        const code = r.u8();
        this.validateResponseCode(code);

        this.messageResponseCode = code;

        if (code === ResponseCode.CONTACT_MSG_RECV) {
            const pubkeyPrefix = r.bytes(6);
            const pathLen = r.u8();
            const txtType = r.u8();
            const senderTimestamp = r.u32le();
            const text = r.restUtf8();

            return {
                code: code,
                pubkey_prefix: pubkeyPrefix.toString("hex"),
                path_len: pathLen == 0xff ? -1 : pathLen,
                txt_type: txtType,
                sender_timestamp: senderTimestamp,
                text: text,
            };
        } else if (code === ResponseCode.CHANNEL_MSG_RECV) {
            const channelIdx = r.u8();
            const pathLen = r.u8();
            const txtType = r.u8();
            const senderTimestamp = r.u32le();
            const text = r.restUtf8();

            return {
                code: code,
                channel_idx: channelIdx,
                path_len: pathLen == 0xff ? -1 : pathLen,
                txt_type: txtType,
                sender_timestamp: senderTimestamp,
                text: text,
            };
        } else if (code === ResponseCode.CONTACT_MSG_RECV_V3) {
            const snr = r.u8() / 4;
            r.bytes(2);
            const pubkeyPrefix = r.bytes(6);
            const pathLen = r.u8();
            const txtType = r.u8();
            const senderTimestamp = r.u32le();
            const text = r.restUtf8();

            return {
                code: code,
                snr: snr,
                pubkey_prefix: pubkeyPrefix.toString("hex"),
                path_len: pathLen == 0xff ? -1 : pathLen,
                txt_type: txtType,
                sender_timestamp: senderTimestamp,
                text: text,
            };
        } else if (code === ResponseCode.CHANNEL_MSG_RECV_V3) {
            const snr = r.u8() / 4;
            r.bytes(2);
            const channelIdx = r.u8();
            const pathLen = r.u8();
            const txtType = r.u8();
            const senderTimestamp = r.u32le();
            const text = r.restUtf8();

            return {
                code: code,
                snr: snr,
                channel_idx: channelIdx,
                path_len: pathLen,
                txt_type: txtType,
                sender_timestamp: senderTimestamp,
                text: text,
            };
        }
    }
}
