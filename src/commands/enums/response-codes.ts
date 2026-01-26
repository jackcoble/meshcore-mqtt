/**
 * Response Codes are sent by the MeshCore device in response to commands.
 * Extracted from: https://github.com/meshcore-dev/MeshCore/wiki/Companion-Radio-Protocol#app-commandsrequests
 */
export enum ResponseCode {
    OK = 0,
    ERR = 1,
    CONTACTS_START = 2,
    CONTACT = 3,
    END_OF_CONTACTS = 4,
    SELF_INFO = 5,
    SENT = 6,
    CONTACT_MSG_RECV = 7,
    CHANNEL_MSG_RECV = 8,
    CURR_TIME = 9,
    NO_MORE_MESSAGES = 10,
    EXPORT_CONTACT = 11,
    BATT_AND_STORAGE = 12,
    DEVICE_INFO = 13,
    CONTACT_MSG_RECV_V3 = 16,
    CHANNEL_MSG_RECV_V3 = 17,
    CUSTOM_VARS = 21,
    ADVERT_PATH = 22,
    TUNING_PARAMS = 23,
    STATS = 24,
}
