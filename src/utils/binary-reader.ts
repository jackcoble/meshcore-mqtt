/**
 * Utility class for reading binary data from a Buffer.
 */
export class BinaryReader {
    private offset = 0;

    constructor(private readonly buf: Buffer) {}

    /**
     * Read an unsigned 8-bit integer (1 byte)
     * @returns {number} The read value
     */
    u8(): number {
        return this.buf.readUInt8(this.offset++);
    }

    /**
     * Read a signed 32-bit little-endian integer (4 bytes)
     * @returns {number} The read value
     */
    i32le(): number {
        const v = this.buf.readInt32LE(this.offset);
        this.offset += 4;
        return v;
    }

    /**
     * Read an unsigned 32-bit little-endian integer (4 bytes)
     * @returns {number} The read value
     */
    u32le(): number {
        const v = this.buf.readUInt32LE(this.offset);
        this.offset += 4;
        return v;
    }

    /**
     * Read an unsigned 16-bit little-endian integer (2 bytes)
     * @returns
     */
    u16le(): number {
        const v = this.buf.readUInt16LE(this.offset);
        this.offset += 2;
        return v;
    }

    /**
     * Read a byte array of specified length
     * @param len Length of the byte array to read
     * @returns {Buffer} The read byte array
     */
    bytes(len: number): Buffer {
        const v = this.buf.subarray(this.offset, this.offset + len);
        this.offset += len;
        return v;
    }

    /**
     * Read the rest of the buffer as a UTF-8 string
     * @returns {string} The read string
     */
    restUtf8(): string {
        const v = this.buf.subarray(this.offset).toString("utf8");
        this.offset = this.buf.length;
        return v;
    }

    /**
     * Read a fixed-length ASCII string and stop at null byte
     * @param len Length of the string to read
     * @returns The decoded ASCII string (null-terminated)
     */
    asciiChars(len: number): string {
        const slice = this.buf.subarray(this.offset, this.offset + len);
        this.offset += len;

        // Find null terminator if present
        const nullIndex = slice.indexOf(0);
        const end = nullIndex >= 0 ? nullIndex : len;

        return slice.subarray(0, end).toString("ascii");
    }
}
