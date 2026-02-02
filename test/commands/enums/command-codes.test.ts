import { describe, it, expect } from "vitest";
import { CommandCode } from "../../../src/commands/enums/command-codes";
import { ResponseCode } from "../../../src/commands/enums/response-codes";

describe("CommandCode", () => {
    it("should have correct values for common commands", () => {
        expect(CommandCode.APP_START).toBe(1);
        expect(CommandCode.SEND_TXT_MSG).toBe(2);
        expect(CommandCode.SEND_CHANNEL_TXT_MSG).toBe(3);
        expect(CommandCode.DEVICE_QUERY).toBe(22);
        expect(CommandCode.GET_BATT_AND_STORAGE).toBe(20);
        expect(CommandCode.SYNC_NEXT_MESSAGE).toBe(10);
    });

    it("should have all expected command codes", () => {
        const expectedCodes = {
            APP_START: 1,
            SEND_TXT_MSG: 2,
            SEND_CHANNEL_TXT_MSG: 3,
            GET_CONTACTS: 4,
            GET_DEVICE_TIME: 5,
            SET_DEVICE_TIME: 6,
            SEND_SELF_ADVERT: 7,
            SET_ADVERT_NAME: 8,
            ADD_UPDATE_CONTACT: 9,
            SYNC_NEXT_MESSAGE: 10,
            SET_RADIO_PARAMS: 11,
            SET_RADIO_TX_POWER: 12,
            RESET_PATH: 13,
            SET_ADVERT_LATLON: 14,
            REMOVE_CONTACT: 15,
            SHARE_CONTACT: 16,
            EXPORT_CONTACT: 17,
            IMPORT_CONTACT: 18,
            REBOOT: 19,
            GET_BATT_AND_STORAGE: 20,
            SET_TUNING_PARAMS: 21,
            DEVICE_QUERY: 22,
            SEND_RAW_DATA: 25,
            SEND_LOGIN: 26,
            SEND_STATUS_REQ: 27,
            SEND_TRACE_PATH: 36,
            SET_OTHER_PARAMS: 38,
            SEND_TELEMETRY_REQ: 39,
            GET_CUSTOM_VARS: 40,
            SET_CUSTOM_VAR: 41,
            GET_ADVERT_PATH: 42,
            GET_TUNING_PARAMS: 43,
            SEND_BINARY_REQ: 50,
            FACTORY_RESET: 51,
            SEND_CONTROL_DATA: 55,
            GET_STATS: 56,
        };

        for (const [key, value] of Object.entries(expectedCodes)) {
            expect(CommandCode[key as keyof typeof CommandCode]).toBe(value);
        }
    });

    it("should be numeric enum", () => {
        expect(typeof CommandCode.APP_START).toBe("number");
        expect(typeof CommandCode.DEVICE_QUERY).toBe("number");
    });
});

describe("ResponseCode", () => {
    it("should have correct values for common responses", () => {
        expect(ResponseCode.OK).toBe(0);
        expect(ResponseCode.ERR).toBe(1);
        expect(ResponseCode.SENT).toBe(6);
        expect(ResponseCode.DEVICE_INFO).toBe(13);
        expect(ResponseCode.BATT_AND_STORAGE).toBe(12);
        expect(ResponseCode.NO_MORE_MESSAGES).toBe(10);
    });

    it("should have all expected response codes", () => {
        const expectedCodes = {
            OK: 0,
            ERR: 1,
            CONTACTS_START: 2,
            CONTACT: 3,
            END_OF_CONTACTS: 4,
            SELF_INFO: 5,
            SENT: 6,
            CONTACT_MSG_RECV: 7,
            CHANNEL_MSG_RECV: 8,
            CURR_TIME: 9,
            NO_MORE_MESSAGES: 10,
            EXPORT_CONTACT: 11,
            BATT_AND_STORAGE: 12,
            DEVICE_INFO: 13,
            CONTACT_MSG_RECV_V3: 16,
            CHANNEL_MSG_RECV_V3: 17,
            CUSTOM_VARS: 21,
            ADVERT_PATH: 22,
            TUNING_PARAMS: 23,
            STATS: 24,
        };

        for (const [key, value] of Object.entries(expectedCodes)) {
            expect(ResponseCode[key as keyof typeof ResponseCode]).toBe(value);
        }
    });

    it("should be numeric enum", () => {
        expect(typeof ResponseCode.OK).toBe("number");
        expect(typeof ResponseCode.DEVICE_INFO).toBe("number");
    });

    it("should support message-related response codes", () => {
        expect(ResponseCode.CONTACT_MSG_RECV).toBe(7);
        expect(ResponseCode.CHANNEL_MSG_RECV).toBe(8);
        expect(ResponseCode.CONTACT_MSG_RECV_V3).toBe(16);
        expect(ResponseCode.CHANNEL_MSG_RECV_V3).toBe(17);
    });
});
