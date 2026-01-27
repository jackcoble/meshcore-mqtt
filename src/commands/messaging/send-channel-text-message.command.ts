import { CommandCode } from "../enums/command-codes";
import { ResponseCode } from "../enums/response-codes";
import { ParameterisedCommand } from "../base/command";
import { BinaryReader } from "../../utils/binary-reader";
import * as z from "zod";
import { commandRegistry } from "../base/registry";

/**
 * Send Channel Text Message command
 */
export class SendChannelTextMessageCommand extends ParameterisedCommand {
    static readonly type = "send_channel_text_message";

    readonly commandCode = CommandCode.SEND_CHANNEL_TXT_MSG;
    readonly expectedResponseCodes = [ResponseCode.OK, ResponseCode.ERR];

    readonly commandSchema = z.object({
        txtType: z.number().int().min(0).max(255).default(0), // PLAIN text type
        channelIdx: z.number().int().min(0).max(255).default(0), // Public channel by default
        senderTimestamp: z
            .number()
            .int()
            .min(0)
            .default(() => Math.floor(Date.now() / 1000)),
        text: z.string().max(160).default(null),
    });

    private params?: z.infer<typeof this.commandSchema>;

    constructor() {
        super();
    }

    fromJSON(data: unknown): this {
        this.params = this.commandSchema.parse(data);
        return this;
    }

    toBuffer(): Buffer {
        if (!this.params) {
            throw new Error("Command not initialised - call fromJSON first");
        }

        const { txtType, channelIdx, senderTimestamp, text } = this.params;
        const header = Buffer.alloc(1 + 1 + 1 + 4);

        let offset = 0;
        header.writeUInt8(CommandCode.SEND_CHANNEL_TXT_MSG, offset++);
        header.writeUInt8(txtType, offset++);
        header.writeUInt8(channelIdx, offset++);
        header.writeUInt32LE(senderTimestamp, offset);

        const textBuf = Buffer.from(text, "utf8");

        return Buffer.concat([header, textBuf]);
    }

    fromBuffer(data: Buffer) {
        const r = new BinaryReader(data);
        const code = r.u8();
        this.validateResponseCode(code);
        return null;
    }
}

commandRegistry.register(SendChannelTextMessageCommand);
