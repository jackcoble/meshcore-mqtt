import { describe, it, expect } from "vitest";
import { BinaryReader } from "../../src/utils/binary-reader";

describe("BinaryReader", () => {
    it("should read u8", () => {
        const buf = Buffer.from([0xff, 0x00, 0x42]);
        const reader = new BinaryReader(buf);
        expect(reader.u8()).toBe(0xff);
        expect(reader.u8()).toBe(0x00);
        expect(reader.u8()).toBe(0x42);
    });

    it("should read i32le", () => {
        const buf = Buffer.from([
            0xff, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80,
        ]);
        const reader = new BinaryReader(buf);
        expect(reader.i32le()).toBe(0xff);
        expect(reader.i32le()).toBe(-2147483647);
    });

    it("should read u32le", () => {
        const buf = Buffer.from([
            0xff, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff,
        ]);
        const reader = new BinaryReader(buf);
        expect(reader.u32le()).toBe(0xff);
        expect(reader.u32le()).toBe(0xffffffff);
    });

    it("should read bytes", () => {
        const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
        const reader = new BinaryReader(buf);
        const result = reader.bytes(3);
        expect(result).toEqual(Buffer.from([0x01, 0x02, 0x03]));
    });

    it("should read restUtf8", () => {
        const buf = Buffer.from("Hello World", "utf8");
        const reader = new BinaryReader(buf);
        const result = reader.restUtf8();
        expect(result).toBe("Hello World");
    });

    it("should read asciiChars with null terminator", () => {
        const buf = Buffer.from("TestString\u0000ExtraData", "ascii");
        const reader = new BinaryReader(buf);
        const result = reader.asciiChars(20);
        expect(result).toBe("TestString");
    });

    it("should read asciiChars without null terminator", () => {
        const buf = Buffer.from("NoNullTerminator", "ascii");
        const reader = new BinaryReader(buf);
        const result = reader.asciiChars(16);
        expect(result).toBe("NoNullTerminator");
    });

    it("should handle sequential reads with mixed types", () => {
        const buf = Buffer.from([0x42, 0x01, 0x00, 0x00, 0x00, 0x48, 0x69]);
        const reader = new BinaryReader(buf);
        expect(reader.u8()).toBe(0x42);
        expect(reader.i32le()).toBe(1);
        expect(reader.restUtf8()).toBe("Hi");
    });

    it("should read empty bytes array", () => {
        const buf = Buffer.from([0x01, 0x02]);
        const reader = new BinaryReader(buf);
        expect(reader.bytes(0)).toEqual(Buffer.alloc(0));
    });
});
