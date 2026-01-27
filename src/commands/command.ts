import { CommandCode } from "./enums/command-codes";
import { ResponseCode } from "./enums/response-codes";
/**
 * Abstract base class for commands sent to the MeshCore device.
 */
export abstract class Command {
    abstract readonly commandCode: CommandCode;
    abstract readonly expectedResponseCodes: ResponseCode[];

    /**
     * Serialise the command to a Buffer for transmission
     */
    abstract toBuffer(): Buffer;

    /**
     * Serialise a command from a JSON object, ready for transmission
     */
    abstract fromJSON(data: string): Buffer;

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
