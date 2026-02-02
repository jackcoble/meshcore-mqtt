import { describe, it, expect } from "vitest";
import {
    Command,
    ParameterisedCommand,
} from "../../../src/commands/base/command";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";
import * as z from "zod";

// Mock implementations for testing
class TestCommand extends Command {
    static readonly type = "test_command";
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK, ResponseCode.SENT];

    toBuffer(): Buffer {
        return Buffer.from([this.commandCode]);
    }

    fromBuffer(data: Buffer): object {
        const responseCode = data[0];
        this.validateResponseCode(responseCode);
        return { code: responseCode };
    }
}

class TestParameterisedCommand extends ParameterisedCommand {
    static readonly type = "test_param_command";
    readonly commandCode = CommandCode.SEND_TXT_MSG;
    readonly expectedResponseCodes = [ResponseCode.OK];
    readonly commandSchema = z.object({
        message: z.string().min(1),
        recipient: z.string(),
    });

    private message: string = "";
    private recipient: string = "";

    fromJSON(data: unknown): this {
        const parsed = this.commandSchema.parse(data);
        this.message = parsed.message;
        this.recipient = parsed.recipient;
        return this;
    }

    toBuffer(): Buffer {
        const msgBuffer = Buffer.from(this.message);
        const recipientBuffer = Buffer.from(this.recipient);
        return Buffer.concat([
            Buffer.from([this.commandCode]),
            msgBuffer,
            recipientBuffer,
        ]);
    }

    fromBuffer(data: Buffer): object {
        const responseCode = data[0];
        this.validateResponseCode(responseCode);
        return { code: responseCode };
    }
}

describe("Command", () => {
    describe("validateResponseCode", () => {
        it("should accept expected response codes", () => {
            const command = new TestCommand();
            const buffer = Buffer.from([ResponseCode.OK]);
            expect(() => command.fromBuffer(buffer)).not.toThrow();
        });

        it("should accept multiple expected response codes", () => {
            const command = new TestCommand();
            const buffer1 = Buffer.from([ResponseCode.OK]);
            const buffer2 = Buffer.from([ResponseCode.SENT]);
            expect(() => command.fromBuffer(buffer1)).not.toThrow();
            expect(() => command.fromBuffer(buffer2)).not.toThrow();
        });

        it("should throw for unexpected response codes", () => {
            const command = new TestCommand();
            const buffer = Buffer.from([ResponseCode.ERR]);
            expect(() => command.fromBuffer(buffer)).toThrow(
                "Unexpected response code"
            );
        });

        it("should include expected codes in error message", () => {
            const command = new TestCommand();
            const buffer = Buffer.from([ResponseCode.ERR]);
            expect(() => command.fromBuffer(buffer)).toThrow(
                /expected one of.*0x0.*0x6/
            );
        });
    });

    describe("properties", () => {
        it("should have static type property", () => {
            expect(TestCommand.type).toBe("test_command");
        });

        it("should have commandCode property", () => {
            const command = new TestCommand();
            expect(command.commandCode).toBe(CommandCode.APP_START);
        });

        it("should have expectedResponseCodes property", () => {
            const command = new TestCommand();
            expect(command.expectedResponseCodes).toEqual([
                ResponseCode.OK,
                ResponseCode.SENT,
            ]);
        });
    });
});

describe("ParameterisedCommand", () => {
    describe("fromJSON", () => {
        it("should parse valid JSON parameters", () => {
            const command = new TestParameterisedCommand();
            const result = command.fromJSON({
                message: "Hello",
                recipient: "user123",
            });
            expect(result).toBe(command);
            const buffer = command.toBuffer();
            expect(buffer.length).toBeGreaterThan(1);
        });

        it("should throw on invalid parameters", () => {
            const command = new TestParameterisedCommand();
            expect(() => command.fromJSON({ message: "" })).toThrow();
        });

        it("should throw on missing required fields", () => {
            const command = new TestParameterisedCommand();
            expect(() => command.fromJSON({ message: "test" })).toThrow();
        });

        it("should validate against commandSchema", () => {
            const command = new TestParameterisedCommand();
            expect(() =>
                command.fromJSON({
                    message: 123, // should be string
                    recipient: "user",
                })
            ).toThrow();
        });
    });

    describe("properties", () => {
        it("should have commandSchema property", () => {
            const command = new TestParameterisedCommand();
            expect(command.commandSchema).toBeDefined();
            expect(command.commandSchema).toBeInstanceOf(z.ZodObject);
        });
    });
});
