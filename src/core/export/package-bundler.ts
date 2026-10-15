import zlib from "zlib";
import crypto from "crypto";
import { ExportOutputFile } from "./types";

/**
 * Fortress AI — Zero-Dependency PKWARE ZIP Archive Builder & Extractor (TDD §21.2, §36.1, FR-080)
 * Uses standard PKWARE zip headers and Node.js built-in zlib.deflateRawSync / inflateRawSync.
 * 100% compliant with standard unzip, Windows Explorer, macOS Archive Utility, and Linux unzip.
 */

// CRC-32 Table
let crc32Table: Uint32Array | null = null;
function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  crc32Table = table;
  return table;
}

export function calculateCrc32(buf: Buffer): number {
  const table = getCrc32Table();
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

interface ZipEntry {
  path: string;
  data: Buffer;
  compressedData: Buffer;
  compressionMethod: number; // 8 = Deflate, 0 = Stored
  crc32: number;
  uncompressedSize: number;
  compressedSize: number;
  localHeaderOffset: number;
  modTime: number;
  modDate: number;
}

/**
 * Packs files into a standard PKWARE ZIP archive buffer.
 */
export function buildZipArchive(files: ExportOutputFile[]): {
  buffer: Buffer;
  sha256: string;
  sizeBytes: number;
  fileCount: number;
} {
  const entries: ZipEntry[] = [];
  const now = new Date();
  const modTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const modDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  // Compress each file
  for (const file of files) {
    const rawData = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf-8");
    const crc = calculateCrc32(rawData);

    let compressed: Buffer = Buffer.from(zlib.deflateRawSync(rawData));
    let method = 8; // Deflate

    // If compressed is larger or raw is 0 bytes, use stored (0)
    if (compressed.length >= rawData.length || rawData.length === 0) {
      compressed = Buffer.from(rawData);
      method = 0;
    }

    entries.push({
      path: file.path.replace(/\\/g, "/").replace(/^\//, ""),
      data: rawData,
      compressedData: compressed,
      compressionMethod: method,
      crc32: crc,
      uncompressedSize: rawData.length,
      compressedSize: compressed.length,
      localHeaderOffset: 0,
      modTime,
      modDate,
    });
  }

  // 1. Build Local File Records
  const localChunks: Buffer[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    entry.localHeaderOffset = currentOffset;
    const nameBuf = Buffer.from(entry.path, "utf-8");

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); // Local file header signature
    header.writeUInt16LE(20, 4); // Version needed (2.0)
    header.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8 filename)
    header.writeUInt16LE(entry.compressionMethod, 8); // Compression method
    header.writeUInt16LE(entry.modTime, 10);
    header.writeUInt16LE(entry.modDate, 12);
    header.writeUInt32LE(entry.crc32, 14);
    header.writeUInt32LE(entry.compressedSize, 18);
    header.writeUInt32LE(entry.uncompressedSize, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28); // Extra field length

    localChunks.push(header);
    localChunks.push(nameBuf);
    localChunks.push(entry.compressedData);

    currentOffset += header.length + nameBuf.length + entry.compressedData.length;
  }

  // 2. Build Central Directory
  const centralDirOffset = currentOffset;
  const centralChunks: Buffer[] = [];

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.path, "utf-8");

    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central file header signature
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed to extract
    cdHeader.writeUInt16LE(0x0800, 8); // General purpose bit flag
    cdHeader.writeUInt16LE(entry.compressionMethod, 10);
    cdHeader.writeUInt16LE(entry.modTime, 12);
    cdHeader.writeUInt16LE(entry.modDate, 14);
    cdHeader.writeUInt32LE(entry.crc32, 16);
    cdHeader.writeUInt32LE(entry.compressedSize, 20);
    cdHeader.writeUInt32LE(entry.uncompressedSize, 24);
    cdHeader.writeUInt16LE(nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // File comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(entry.localHeaderOffset, 42); // Relative offset of local header

    centralChunks.push(cdHeader);
    centralChunks.push(nameBuf);

    currentOffset += cdHeader.length + nameBuf.length;
  }

  const centralDirSize = currentOffset - centralDirOffset;

  // 3. End of Central Directory Record (EOCD)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // ZIP comment length

  // Combine all buffers
  const fullArchive = Buffer.concat([...localChunks, ...centralChunks, eocd]);
  const sha256 = crypto.createHash("sha256").update(fullArchive).digest("hex");

  return {
    buffer: fullArchive,
    sha256,
    sizeBytes: fullArchive.length,
    fileCount: entries.length,
  };
}

/**
 * Extracts a PKWARE ZIP buffer into a Map of relative file paths to uncompressed Buffers.
 * Used for automated verification and smoke tests without requiring external CLI or packages.
 */
export function extractZipArchive(zipBuffer: Buffer): Map<string, Buffer> {
  const result = new Map<string, Buffer>();

  // Find End of Central Directory signature (0x06054b50) scanning from back
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP archive: End of Central Directory signature not found");
  }

  const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  let currentCd = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (zipBuffer.readUInt32LE(currentCd) !== 0x02014b50) {
      throw new Error(`Invalid central directory header at offset ${currentCd}`);
    }

    const compressionMethod = zipBuffer.readUInt16LE(currentCd + 10);
    const compressedSize = zipBuffer.readUInt32LE(currentCd + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(currentCd + 24);
    const fileNameLen = zipBuffer.readUInt16LE(currentCd + 28);
    const extraLen = zipBuffer.readUInt16LE(currentCd + 30);
    const commentLen = zipBuffer.readUInt16LE(currentCd + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(currentCd + 42);

    const fileName = zipBuffer.toString("utf-8", currentCd + 46, currentCd + 46 + fileNameLen);

    // Read local header
    if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Invalid local file header at offset ${localHeaderOffset} for ${fileName}`);
    }

    const localFileNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
    const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    let uncompressedData: Buffer;
    if (compressionMethod === 0) {
      uncompressedData = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      uncompressedData = Buffer.from(zlib.inflateRawSync(compressedData));
    } else {
      throw new Error(`Unsupported compression method ${compressionMethod} for ${fileName}`);
    }

    result.set(fileName, uncompressedData);

    currentCd += 46 + fileNameLen + extraLen + commentLen;
  }

  return result;
}
