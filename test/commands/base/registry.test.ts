import { describe, it, expect, beforeEach } from "vitest";
import {
    CommandRegistry,
    commandRegistry,
} from "../../../src/commands/base/registry";
import { Command } from "../../../src/commands/base/command";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

// Mock command class for testing
class MockCommand extends Command {
    static readonly type = "mock_command";
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK];

    toBuffer(): Buffer {
        return Buffer.from([1, 2, 3]);
    }

    fromBuffer(data: Buffer): object {
        return { data: "test" };
    }
}

// Invalid command without type
class InvalidCommandNoType extends Command {
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK];

    toBuffer(): Buffer {
        return Buffer.from([]);
    }

    fromBuffer(data: Buffer): object {
        return {};
    }
}

// Invalid command with non-snake_case type
class InvalidCommandBadType extends Command {
    static readonly type = "BadType";
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK];

    toBuffer(): Buffer {
        return Buffer.from([]);
    }

    fromBuffer(data: Buffer): object {
        return {};
    }
}

class ValidSnakeCaseCommand extends Command {
    static readonly type = "valid_snake_case_123";
    readonly commandCode = CommandCode.APP_START;
    readonly expectedResponseCodes = [ResponseCode.OK];

    toBuffer(): Buffer {
        return Buffer.from([]);
    }

    fromBuffer(data: Buffer): object {
        return {};
    }
}

describe("CommandRegistry", () => {
    // Test using fresh instances of CommandRegistry

    describe("register", () => {
        it("should register a valid command", () => {
            const registry = new CommandRegistry();
            expect(() => registry.register(MockCommand)).not.toThrow();
            expect(registry.has("mock_command")).toBe(true);
        });

        it("should throw if command does not define a static type property", () => {
            const registry = new CommandRegistry();
            expect(() => registry.register(InvalidCommandNoType)).toThrow(
                "must define a static 'type' property"
            );
        });

        it("should throw if command type is not snake_case", () => {
            const registry = new CommandRegistry();
            expect(() => registry.register(InvalidCommandBadType)).toThrow(
                "must be snake_case"
            );
        });

        it("should accept various valid snake_case formats", () => {
            const registry = new CommandRegistry();
            expect(() =>
                registry.register(ValidSnakeCaseCommand)
            ).not.toThrow();
            expect(registry.has("valid_snake_case_123")).toBe(true);
        });
    });

    describe("get", () => {
        it("should return registered command class", () => {
            const registry = new CommandRegistry();
            registry.register(MockCommand);
            const CommandClass = registry.get("mock_command");
            expect(CommandClass).toBe(MockCommand);
        });

        it("should return undefined for unregistered command type", () => {
            const registry = new CommandRegistry();
            const CommandClass = registry.get("nonexistent");
            expect(CommandClass).toBeUndefined();
        });
    });

    describe("has", () => {
        it("should return true for registered command", () => {
            const registry = new CommandRegistry();
            registry.register(MockCommand);
            expect(registry.has("mock_command")).toBe(true);
        });

        it("should return false for unregistered command", () => {
            const registry = new CommandRegistry();
            expect(registry.has("nonexistent")).toBe(false);
        });
    });

    describe("listTypes", () => {
        it("should return empty array when no commands registered", () => {
            const registry = new CommandRegistry();
            expect(registry.listTypes()).toEqual([]);
        });

        it("should return list of registered command types", () => {
            const registry = new CommandRegistry();
            registry.register(MockCommand);
            registry.register(ValidSnakeCaseCommand);
            const types = registry.listTypes();
            expect(types).toContain("mock_command");
            expect(types).toContain("valid_snake_case_123");
            expect(types).toHaveLength(2);
        });
    });
});
