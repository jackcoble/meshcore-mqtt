import { Command } from "./command";

export type CommandClass = new (...args: any[]) => Command;

/**
 * Maintains a "registry" of Commands that can be used for MQTT -> Radio communication
 */
class CommandRegistry {
    private commands = new Map<string, CommandClass>();

    register(commandClass: CommandClass): void {
        const type = (commandClass as any).type;
        if (!type) {
            throw new Error(
                `Command ${commandClass.name} must define a static 'type' property`
            );
        }

        // Check that the command "type" is snake case
        if (!/^[a-z][a-z0-9_]*$/.test(type)) {
            throw new Error(`Command type '${type}' must be snake_case`);
        }

        this.commands.set(type, commandClass);
    }

    /**
     * Returns the Command class from a given type
     * @param type - Command type
     * @returns {CommandClass | null}
     */
    get(type: string): CommandClass | undefined {
        return this.commands.get(type);
    }

    /**
     * Checks if we have a Command class registered, from a given type
     * @param type - Command type
     * @returns {boolean}
     */
    has(type: string): boolean {
        return this.commands.has(type);
    }

    /**
     * List available command types
     * @returns {string[]}
     */
    listTypes(): string[] {
        return Array.from(this.commands.keys());
    }
}

export const commandRegistry = new CommandRegistry();
