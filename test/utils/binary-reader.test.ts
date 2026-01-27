import { describe, it, expect } from "vitest";
import { BinaryReader } from "../../src/utils/binary-reader";

describe("BinaryReader", () => {
    describe("u8", () => {
        it("should read single u8 values", () => {
            const buf = Buffer.from([0xff, 0x00, 0x42]);
            const reader = new BinaryReader(buf);
            expect(reader.u8()).toBe(0xff);
            expect(reader.u8()).toBe(0x00);
            expect(reader.u8()).toBe(0x42);
        });

        it("should handle minimum and maximum u8 values", () => {
            const buf = Buffer.from([0x00, 0xff]);
            const reader = new BinaryReader(buf);
            expect(reader.u8()).toBe(0);
            expect(reader.u8()).toBe(255);
        });
    });

    describe("i32le", () => {
        it("should read positive i32le values", () => {
            const buf = Buffer.alloc(8);
            buf.writeInt32LE(255, 0);
            buf.writeInt32LE(2147483647, 4); // Max positive i32
            const reader = new BinaryReader(buf);
            expect(reader.i32le()).toBe(255);
            expect(reader.i32le()).toBe(2147483647);
        });

        it("should read negative i32le values", () => {
            const buf = Buffer.alloc(8);
            buf.writeInt32LE(-1, 0);
            buf.writeInt32LE(-2147483648, 4); // Min negative i32
            const reader = new BinaryReader(buf);
            expect(reader.i32le()).toBe(-1);
            expect(reader.i32le()).toBe(-2147483648);
        });

        it("should read zero", () => {
            const buf = Buffer.alloc(4);
            buf.writeInt32LE(0, 0);
            const reader = new BinaryReader(buf);
            expect(reader.i32le()).toBe(0);
        });

        it("should handle little-endian byte order", () => {
            // 0x12345678 in little-endian: 78 56 34 12
            const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
            const reader = new BinaryReader(buf);
            expect(reader.i32le()).toBe(0x12345678);
        });
    });

    describe("u32le", () => {
        it("should read u32le values", () => {
            const buf = Buffer.alloc(8);
            buf.writeUInt32LE(0xff, 0);
            buf.writeUInt32LE(0xffffffff, 4);
            const reader = new BinaryReader(buf);
            expect(reader.u32le()).toBe(0xff);
            expect(reader.u32le()).toBe(0xffffffff);
        });

        it("should read zero", () => {
            const buf = Buffer.alloc(4);
            buf.writeUInt32LE(0, 0);
            const reader = new BinaryReader(buf);
            expect(reader.u32le()).toBe(0);
        });

        it("should handle maximum u32 value", () => {
            const buf = Buffer.alloc(4);
            buf.writeUInt32LE(4294967295, 0);
            const reader = new BinaryReader(buf);
            expect(reader.u32le()).toBe(4294967295);
        });
    });

    describe("u16le", () => {
        it("should read u16le values in little-endian", () => {
            const buf = Buffer.from([0x34, 0x12, 0xff, 0x00]);
            const reader = new BinaryReader(buf);
            expect(reader.u16le()).toBe(0x1234);
            expect(reader.u16le()).toBe(0x00ff);
        });

        it("should handle minimum and maximum u16 values", () => {
            const buf = Buffer.alloc(4);
            buf.writeUInt16LE(0, 0);
            buf.writeUInt16LE(65535, 2);
            const reader = new BinaryReader(buf);
            expect(reader.u16le()).toBe(0);
            expect(reader.u16le()).toBe(65535);
        });
    });

    describe("bytes", () => {
        it("should read specified number of bytes", () => {
            const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
            const reader = new BinaryReader(buf);
            const result = reader.bytes(3);
            expect(result).toEqual(Buffer.from([0x01, 0x02, 0x03]));
        });

        it("should read empty bytes array", () => {
            const buf = Buffer.from([0x01, 0x02]);
            const reader = new BinaryReader(buf);
            expect(reader.bytes(0)).toEqual(Buffer.alloc(0));
        });

        it("should advance offset correctly", () => {
            const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
            const reader = new BinaryReader(buf);
            reader.bytes(2);
            expect(reader.u8()).toBe(0x03);
        });

        it("should return a subarray of the original buffer", () => {
            const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
            const reader = new BinaryReader(buf);
            const result = reader.bytes(3);
            // Verify it's a view into the original buffer
            expect(result.buffer).toBe(buf.buffer);
        });
    });

    describe("restUtf8", () => {
        it("should read the rest of the buffer as UTF-8", () => {
            const buf = Buffer.from("Hello World", "utf8");
            const reader = new BinaryReader(buf);
            expect(reader.restUtf8()).toBe("Hello World");
        });

        it("should read remaining bytes after offset", () => {
            const buf = Buffer.from([0x42, 0x48, 0x69]); // 'B' + "Hi"
            const reader = new BinaryReader(buf);
            reader.u8(); // Skip first byte
            expect(reader.restUtf8()).toBe("Hi");
        });

        it("should handle empty remaining buffer", () => {
            const buf = Buffer.from([0x01]);
            const reader = new BinaryReader(buf);
            reader.u8();
            expect(reader.restUtf8()).toBe("");
        });

        it("should handle unicode characters", () => {
            const buf = Buffer.from("Hello 世界 🌍", "utf8");
            const reader = new BinaryReader(buf);
            expect(reader.restUtf8()).toBe("Hello 世界 🌍");
        });
    });

    describe("asciiChars", () => {
        it("should read ASCII string with null terminator", () => {
            const buf = Buffer.from("TestString\u0000ExtraData", "ascii");
            const reader = new BinaryReader(buf);
            expect(reader.asciiChars(20)).toBe("TestString");
        });

        it("should read ASCII string without null terminator", () => {
            const buf = Buffer.from("NoNullTerminator", "ascii");
            const reader = new BinaryReader(buf);
            expect(reader.asciiChars(16)).toBe("NoNullTerminator");
        });

        it("should handle string shorter than specified length", () => {
            const buf = Buffer.from("Short\u0000\u0000\u0000\u0000\u0000", "ascii");
            const reader = new BinaryReader(buf);
            expect(reader.asciiChars(10)).toBe("Short");
        });

        it("should advance offset by full length regardless of null terminator", () => {
            const buf = Buffer.from("Hi\u0000AB", "ascii");
            const reader = new BinaryReader(buf);
            reader.asciiChars(3);
            expect(reader.asciiChars(2)).toBe("AB");
        });

        it("should handle empty string (immediate null)", () => {
            const buf = Buffer.from("\u0000\u0000\u0000\u0000", "ascii");
            const reader = new BinaryReader(buf);
            expect(reader.asciiChars(4)).toBe("");
        });
    });

    describe("sequential reads with mixed types", () => {
        it("should correctly track offset across mixed reads", () => {
            const buf = Buffer.from([0x42, 0x01, 0x00, 0x00, 0x00, 0x48, 0x69]);
            const reader = new BinaryReader(buf);
            expect(reader.u8()).toBe(0x42);
            expect(reader.i32le()).toBe(1);
            expect(reader.restUtf8()).toBe("Hi");
        });

        it("should handle complex mixed reads", () => {
            // Build a buffer: u8, u16le, u32le, 4 bytes, ascii string
            const buf = Buffer.alloc(15);
            buf.writeUInt8(0xaa, 0);
            buf.writeUInt16LE(0x1234, 1);
            buf.writeUInt32LE(0xdeadbeef, 3);
            buf[7] = 0x01;
            buf[8] = 0x02;
            buf[9] = 0x03;
            buf[10] = 0x04;
            Buffer.from("Test", "ascii").copy(buf, 11);

            const reader = new BinaryReader(buf);
            expect(reader.u8()).toBe(0xaa);
            expect(reader.u16le()).toBe(0x1234);
            expect(reader.u32le()).toBe(0xdeadbeef);
            expect(reader.bytes(4)).toEqual(Buffer.from([0x01, 0x02, 0x03, 0x04]));
            expect(reader.restUtf8()).toBe("Test");
        });
    });
});
