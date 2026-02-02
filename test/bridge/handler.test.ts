import { describe, it, expect, beforeEach } from "vitest";
import { createCommandFromMessage } from "../../src/bridge/handler";
import { commandRegistry } from "../../src/commands/base/registry";
import { Command, ParameterisedCommand } from "../../src/commands/base/command";
import { CommandCode } from "../../src/commands/enums/command-codes";
import { ResponseCode } from "../../src/commands/enums/response-codes";
import * as z from "zod";

// Mock commands for testing
class TestCommand extends Command {
    static readonly type = "test_simple";
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK];

    toBuffer(): Buffer {
        return Buffer.from([1]);
    }

    fromBuffer(data: Buffer): object {
        return {};
    }
}

class TestParamCommand extends ParameterisedCommand {
    static readonly type = "test_param";
    readonly commandCode = CommandCode.SEND_TXT_MSG;
    readonly expectedResponseCodes = [ResponseCode.OK];
    readonly commandSchema = z.object({
        message: z.string(),
        count: z.number().optional(),
    });

    private message: string = "";

    fromJSON(data: unknown): this {
        const parsed = this.commandSchema.parse(data);
        this.message = parsed.message;
        return this;
    }

    toBuffer(): Buffer {
        return Buffer.from(this.message);
    }

    fromBuffer(data: Buffer): object {
        return {};
    }
}

describe("Bridge Handler", () => {
    beforeEach(() => {
        // Register test commands
        commandRegistry.register(TestCommand);
        commandRegistry.register(TestParamCommand);
    });

    describe("createCommandFromMessage", () => {
        it("should create simple command without params", () => {
            const message = { type: "test_simple" };
            const command = createCommandFromMessage(message);
            expect(command).toBeInstanceOf(TestCommand);
        });

        it("should create parameterised command with valid params", () => {
            const message = {
                type: "test_param",
                params: { message: "Hello", count: 5 },
            };
            const command = createCommandFromMessage(message);
            expect(command).toBeInstanceOf(TestParamCommand);
        });

        it("should create parameterised command with optional params missing", () => {
            const message = {
                type: "test_param",
                params: { message: "Hello" },
            };
            const command = createCommandFromMessage(message);
            expect(command).toBeInstanceOf(TestParamCommand);
        });

        it("should handle command without params field", () => {
            const message = { type: "test_simple" };
            const command = createCommandFromMessage(message);
            expect(command).toBeInstanceOf(TestCommand);
        });

        it("should throw for unknown command type", () => {
            const message = { type: "unknown_command" };
            expect(() => createCommandFromMessage(message)).toThrow(
                "Unknown command type: 'unknown_command'"
            );
        });

        it("should list available types in error message", () => {
            const message = { type: "unknown" };
            expect(() => createCommandFromMessage(message)).toThrow(
                /Available types:.*test_simple.*test_param/
            );
        });

        it("should throw for invalid message format", () => {
            expect(() => createCommandFromMessage(null)).toThrow();
            expect(() => createCommandFromMessage(undefined)).toThrow();
            expect(() => createCommandFromMessage("string")).toThrow();
            expect(() => createCommandFromMessage(123)).toThrow();
        });

        it("should throw for missing type field", () => {
            const message = { params: { message: "Hello" } };
            expect(() => createCommandFromMessage(message)).toThrow();
        });

        it("should throw for invalid params", () => {
            const message = {
                type: "test_param",
                params: { message: 123 }, // should be string
            };
            expect(() => createCommandFromMessage(message)).toThrow();
        });

        it("should throw for missing required params", () => {
            const message = {
                type: "test_param",
                params: { count: 5 }, // missing required 'message'
            };
            expect(() => createCommandFromMessage(message)).toThrow();
        });

        it("should handle empty params object", () => {
            const message = { type: "test_simple", params: {} };
            const command = createCommandFromMessage(message);
            expect(command).toBeInstanceOf(TestCommand);
        });

        it("should validate params against command schema", () => {
            const message = {
                type: "test_param",
                params: {
                    message: "Valid message",
                    count: "not a number", // invalid type
                },
            };
            expect(() => createCommandFromMessage(message)).toThrow();
        });
    });
});
