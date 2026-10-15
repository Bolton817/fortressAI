import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { buildZipArchive } from "@/core/export/package-bundler";
import { ExportOutputFile } from "@/core/export/types";

/**
 * Fortress AI — Automated Backup & Snapshot Engine (TDD §35.1, §35.2, FR-085)
 * Captures full data layer snapshots, calculates SHA-256 integrity checksums,
 * and tracks recovery objectives (RPO <= 24h, RTO <= 8h).
 */

export interface BackupSnapshotMetadata {
  snapshotId: string;
  createdAt: string;
  schemaVersion: string;
  sha256: string;
  fileCount: number;
  totalSizeBytes: number;
  archiveSizeBytes: number;
  includedStores: string[];
  rpoHoursTarget: number;
  rtoHoursTarget: number;
}

export class BackupService {
  private baseDataDir: string;
  private backupDir: string;

  constructor(customDataDir?: string, customBackupDir?: string) {
    this.baseDataDir = customDataDir || path.join(process.cwd(), ".data");
    this.backupDir = customBackupDir || path.join(this.baseDataDir, "backups");
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.baseDataDir)) {
      fs.mkdirSync(this.baseDataDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Recursively collect files from directory
   */
  private scanDirectory(dir: string, baseDir: string): ExportOutputFile[] {
    const results: ExportOutputFile[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip the backups directory itself to avoid recursive inclusion
        if (entry.name === "backups" || entry.name === "exports") continue;
        results.push(...this.scanDirectory(fullPath, baseDir));
      } else if (entry.isFile()) {
        // Only include JSON data stores, manifests, and configs
        if (entry.name.endsWith(".json") || entry.name.endsWith(".xml") || entry.name.endsWith(".txt")) {
          const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
          const content = fs.readFileSync(fullPath);
          results.push({
            path: relativePath,
            content,
            contentType: "application/json",
          });
        }
      }
    }
    return results;
  }

  /**
   * Create an automated point-in-time backup snapshot
   */
  public async createSnapshot(): Promise<BackupSnapshotMetadata> {
    this.ensureDirs();
    const snapshotId = `snapshot_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 1. Gather all persistent stores
    const filesToBackup = this.scanDirectory(this.baseDataDir, this.baseDataDir);

    let totalSizeBytes = 0;
    const includedStores = new Set<string>();

    for (const file of filesToBackup) {
      totalSizeBytes += file.content.length;
      const storeFolder = file.path.split("/")[0];
      if (storeFolder) includedStores.add(storeFolder);
    }

    // 2. Compute combined SHA-256
    const combinedHash = crypto.createHash("sha256");
    for (const file of filesToBackup) {
      combinedHash.update(file.path);
      combinedHash.update(file.content);
    }
    const dataChecksum = combinedHash.digest("hex");

    // 3. Create manifest
    const metadata: BackupSnapshotMetadata = {
      snapshotId,
      createdAt: now,
      schemaVersion: "1.0.0",
      sha256: dataChecksum,
      fileCount: filesToBackup.length,
      totalSizeBytes,
      archiveSizeBytes: 0,
      includedStores: Array.from(includedStores).sort(),
      rpoHoursTarget: 24,
      rtoHoursTarget: 8,
    };

    filesToBackup.push({
      path: "backup-manifest.json",
      content: JSON.stringify(metadata, null, 2),
      contentType: "application/json",
    });

    // 4. Pack into standard ZIP archive
    const zipArchive = buildZipArchive(filesToBackup);
    metadata.archiveSizeBytes = zipArchive.sizeBytes;
    metadata.sha256 = zipArchive.sha256;

    // 5. Persist archive and metadata to backup storage
    const archivePath = path.join(this.backupDir, `${snapshotId}.zip`);
    const metadataPath = path.join(this.backupDir, `${snapshotId}.meta.json`);

    fs.writeFileSync(archivePath, zipArchive.buffer);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    return metadata;
  }

  /**
   * List all stored snapshots
   */
  public listSnapshots(): BackupSnapshotMetadata[] {
    this.ensureDirs();
    const list: BackupSnapshotMetadata[] = [];
    try {
      const files = fs.readdirSync(this.backupDir);
      for (const file of files) {
        if (file.endsWith(".meta.json")) {
          const raw = fs.readFileSync(path.join(this.backupDir, file), "utf-8");
          list.push(JSON.parse(raw));
        }
      }
    } catch {}
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Read raw snapshot buffer and metadata
   */
  public getSnapshot(snapshotId: string): { metadata: BackupSnapshotMetadata; buffer: Buffer } | null {
    const archivePath = path.join(this.backupDir, `${snapshotId}.zip`);
    const metaPath = path.join(this.backupDir, `${snapshotId}.meta.json`);

    if (!fs.existsSync(archivePath) || !fs.existsSync(metaPath)) {
      return null;
    }

    const metadata = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as BackupSnapshotMetadata;
    const buffer = fs.readFileSync(archivePath);
    return { metadata, buffer };
  }

  /**
   * Delete snapshot
   */
  public deleteSnapshot(snapshotId: string): boolean {
    const archivePath = path.join(this.backupDir, `${snapshotId}.zip`);
    const metaPath = path.join(this.backupDir, `${snapshotId}.meta.json`);
    let deleted = false;
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
      deleted = true;
    }
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
      deleted = true;
    }
    return deleted;
  }
}

export const backupService = new BackupService();
