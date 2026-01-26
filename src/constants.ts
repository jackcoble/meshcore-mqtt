/**
 * Constants used by the Companion Radio Protocol via USB (Serial).
 * https://github.com/meshcore-dev/MeshCore/wiki/Companion-Radio-Protocol
 */

export const FRAME_START_OUTBOUND = 0x3e; // '>' - Frame from radio to app
export const FRAME_START_INBOUND = 0x3c; // '<' - Frame from app to radio

/**
 * Push Codes are unsolicited messages sent by the MeshCore device that can be pushed to the app at any time.
 */
export enum PushCode {
    ADVERT = 0x80,
    PATH_UPDATED = 0x81,
    SEND_CONFIRMED = 0x82,
    MSG_WAITING = 0x83,
    RAW_DATA = 0x84,
    LOGIN_SUCCESS = 0x85,
    LOGIN_FAIL = 0x86,
    STATUS_RESPONSE = 0x87,
    TRACE_DATA = 0x89,
    NEW_ADVERT = 0x8a,
    TELEMETRY_RESPONSE = 0x8b,
    BINARY_RESPONSE = 0x8c,
    CONTROL_DATA = 0x8e,
}
