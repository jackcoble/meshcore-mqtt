import { commandRegistry } from "../commands/registry";
import { Command, ParameterisedCommand } from "../commands/command";
import * as z from "zod";

// Expect a type, and then parameters for the command
const incomingCommandSchema = z.object({
    type: z.string(),
    params: z.record(z.string(), z.any()).optional(),
});

export type IncomingCommand = z.infer<typeof incomingCommandSchema>;

/**
 * Creates a command instance from an incoming MQTT message
 * @param message - The incoming message with { type, params? }
 * @returns A command instance ready to be sent
 * @throws If type is unknown or params validation fails
 */
export function createCommandFromMessage(message: unknown): Command {
    const { type, params } = incomingCommandSchema.parse(message);

    const CommandClass = commandRegistry.get(type);
    if (!CommandClass) {
        const available = commandRegistry.listTypes().join(", ");
        throw new Error(
            `Unknown command type: '${type}'. Available types: ${available}`
        );
    }

    const command = new CommandClass();

    // If command supports params (ParameterisedCommand), validate them
    if (command instanceof ParameterisedCommand && command.commandSchema) {
        command.fromJSON(params ?? {});
    }

    return command;
}
