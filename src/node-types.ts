export enum NodeType {
    NONE = 0,
    CHAT = 1,
    REPEATER = 2,
    ROOM = 3,
}

export enum TextType {
    PLAIN = 0,
    CLI_DATA = 1,
    SIGNED_PLAIN = 2,
}

export const NODE_TYPE_NAMES: Record<NodeType, string> = {
    [NodeType.NONE]: "none",
    [NodeType.CHAT]: "chat",
    [NodeType.REPEATER]: "repeater",
    [NodeType.ROOM]: "room",
};
