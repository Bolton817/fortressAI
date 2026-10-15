import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { backupService } from "@/core/backup/backup-service";
import { recoveryService } from "@/core/backup/recovery-service";
import { seedPhase0Tenants, USER_A_ID } from "@/db/seed-data";

describe("Phase 8: Production Hardening — Backup & Disaster Recovery (TDD §35.1, §35.2, FR-085)", () => {
  const sandboxRestoreDir = path.join(process.cwd(), ".data", "test_dr_sandbox");

  beforeEach(() => {
    seedPhase0Tenants();
    if (fs.existsSync(sandboxRestoreDir)) {
      fs.rmSync(sandboxRestoreDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(sandboxRestoreDir)) {
      fs.rmSync(sandboxRestoreDir, { recursive: true, force: true });
    }
  });

  it("creates an encrypted, checksum-verified backup snapshot of the data layer", async () => {
    const snapshot = await backupService.createSnapshot();

    expect(snapshot.snapshotId).toBeDefined();
    expect(snapshot.sha256).toHaveLength(64);
    expect(snapshot.fileCount).toBeGreaterThan(0);
    expect(snapshot.totalSizeBytes).toBeGreaterThan(0);
    expect(snapshot.archiveSizeBytes).toBeGreaterThan(0);
    expect(snapshot.rpoHoursTarget).toBe(24);
    expect(snapshot.rtoHoursTarget).toBe(8);

    // Verify snapshot file exists in backup storage
    const rawSnapshot = backupService.getSnapshot(snapshot.snapshotId);
    expect(rawSnapshot).not.toBeNull();
    expect(rawSnapshot!.buffer.length).toBe(snapshot.archiveSizeBytes);
  });

  it("executes an automated disaster recovery drill validating RPO, RTO, and data integrity", async () => {
    // 1. Create fresh baseline snapshot
    const snapshot = await backupService.createSnapshot();
    const rawSnapshot = backupService.getSnapshot(snapshot.snapshotId)!;

    // 2. Execute restore drill into isolated sandbox
    const drillResult = await recoveryService.executeRestoreDrill(
      rawSnapshot.buffer,
      sandboxRestoreDir
    );

    expect(drillResult.success).toBe(true);
    expect(drillResult.integrityVerified).toBe(true);
    expect(drillResult.rtoSatisfied).toBe(true);
    expect(drillResult.rpoSatisfied).toBe(true);
    expect(drillResult.filesRestored).toBeGreaterThan(0);
    expect(drillResult.durationMs).toBeLessThan(10000); // Under 10s (target 8h)
    expect(drillResult.validationErrors).toHaveLength(0);

    // Verify actual restored file contents on disk
    expect(fs.existsSync(path.join(sandboxRestoreDir, "sites"))).toBe(true);
    expect(fs.existsSync(path.join(sandboxRestoreDir, "users"))).toBe(true);

    // Clean up created snapshot
    backupService.deleteSnapshot(snapshot.snapshotId);
  });

  it("flags RPO violation when restoring a stale snapshot older than 24 hours", async () => {
    const snapshot = await backupService.createSnapshot();
    const rawSnapshot = backupService.getSnapshot(snapshot.snapshotId)!;

    // Simulate reference time 48 hours in the future
    const simulatedFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const drillResult = await recoveryService.executeRestoreDrill(
      rawSnapshot.buffer,
      sandboxRestoreDir,
      { referenceTime: simulatedFuture }
    );

    expect(drillResult.rpoSatisfied).toBe(false);
    expect(drillResult.success).toBe(false);
    expect(drillResult.validationErrors.some((e) => e.includes("RPO breached"))).toBe(true);

    backupService.deleteSnapshot(snapshot.snapshotId);
  });
});
