import { CommandCode } from "./enums/command-codes";
import { ResponseCode } from "./enums/response-codes";
import * as z from "zod";

/**
 * Abstract base class for commands sent to the MeshCore device.
 */
export abstract class Command {
    // Identifier for the command: e.g. "device_query"
    static readonly type: string;

    abstract readonly commandCode: CommandCode;
    abstract readonly expectedResponseCodes: ResponseCode[];

    /**
     * Serialise the command to a Buffer for transmission
     */
    abstract toBuffer(): Buffer;

    /**
     * Deserialise a response from the radio
     */
    abstract fromBuffer(data: Buffer): object;

    /**
     * Validate the response code received from the device
     * @param code Response code to validate
     */
    protected validateResponseCode(code: ResponseCode): void {
        if (!this.expectedResponseCodes.includes(code)) {
            throw new Error(
                `Unexpected response code: 0x${code.toString(
                    16
                )}, expected one of: ${this.expectedResponseCodes
                    .map((c) => `0x${c.toString(16)}`)
                    .join(", ")}`
            );
        }
    }
}

/**
 * Abstract class for Parameterised Commands (incoming via MQTT)
 */
export abstract class ParameterisedCommand extends Command {
    abstract readonly commandSchema: z.ZodType | null;

    /**
     * Validates command parameters and stores them in a Command instance
     * ready for transmission
     * @param data
     * @returns {this}
     * @throws {z.ZodError} - Validation failed
     */
    abstract fromJSON(data: unknown): this;
}
