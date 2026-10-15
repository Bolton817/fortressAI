/**
 * Fortress AI — System Metrics & Telemetry Collector (TDD §31, §32.1, FR-089)
 * Gathers operational telemetry, latency percentiles, error rates, and subsystem counters.
 */

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}

export interface SystemMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  requests: {
    total: number;
    success2xx: number;
    clientError4xx: number;
    serverError5xx: number;
    errorRate: number;
    latency: LatencyPercentiles;
  };
  ai: {
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    totalCreditsDebited: number;
    avgGenerationDurationMs: number;
  };
  publishing: {
    releasesPublished: number;
    rollbacksExecuted: number;
    publishSuccessRate: number;
  };
  domains: {
    registrations: number;
    verifications: number;
    transfers: number;
    renewals: number;
    failures: number;
  };
  billing: {
    checkouts: number;
    webhooksProcessed: number;
    duplicateWebhooksIgnored: number;
  };
}

export class MetricsCollector {
  private startTime: number = Date.now();

  // Request latencies in milliseconds (ring buffer up to 10,000 samples)
  private latencies: number[] = [];
  private maxLatencySamples = 10000;

  // Request counters
  private totalRequests = 0;
  private success2xx = 0;
  private clientError4xx = 0;
  private serverError5xx = 0;

  // AI subsystem
  private aiTotalGenerations = 0;
  private aiSuccess = 0;
  private aiFailures = 0;
  private aiCreditsDebited = 0;
  private aiDurations: number[] = [];

  // Publishing subsystem
  private releasesPublished = 0;
  private rollbacksExecuted = 0;

  // Domain subsystem
  private domainRegistrations = 0;
  private domainVerifications = 0;
  private domainTransfers = 0;
  private domainRenewals = 0;
  private domainFailures = 0;

  // Billing subsystem
  private billingCheckouts = 0;
  private billingWebhooks = 0;
  private billingDuplicateWebhooks = 0;

  /**
   * Record an incoming HTTP request execution
   */
  public recordRequest(statusCode: number, durationMs: number): void {
    this.totalRequests++;
    if (statusCode >= 200 && statusCode < 400) {
      this.success2xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.clientError4xx++;
    } else if (statusCode >= 500) {
      this.serverError5xx++;
    }

    if (this.latencies.length < this.maxLatencySamples) {
      this.latencies.push(durationMs);
    } else {
      // Evict oldest sample
      this.latencies.shift();
      this.latencies.push(durationMs);
    }
  }

  /**
   * Record AI generation execution
   */
  public recordAiJob(durationMs: number, credits: number, success: boolean): void {
    this.aiTotalGenerations++;
    if (success) {
      this.aiSuccess++;
      this.aiCreditsDebited += credits;
    } else {
      this.aiFailures++;
    }
    this.aiDurations.push(durationMs);
    if (this.aiDurations.length > 1000) this.aiDurations.shift();
  }

  /**
   * Record site publish or rollback event
   */
  public recordPublish(success: boolean, isRollback: boolean = false): void {
    if (isRollback) {
      this.rollbacksExecuted++;
    } else if (success) {
      this.releasesPublished++;
    }
  }

  /**
   * Record domain operation
   */
  public recordDomainOp(
    op: "register" | "verify" | "renew" | "transfer",
    success: boolean
  ): void {
    if (!success) {
      this.domainFailures++;
      return;
    }
    switch (op) {
      case "register":
        this.domainRegistrations++;
        break;
      case "verify":
        this.domainVerifications++;
        break;
      case "renew":
        this.domainRenewals++;
        break;
      case "transfer":
        this.domainTransfers++;
        break;
    }
  }

  /**
   * Record billing event
   */
  public recordBilling(event: "checkout" | "webhook" | "duplicate_webhook"): void {
    switch (event) {
      case "checkout":
        this.billingCheckouts++;
        break;
      case "webhook":
        this.billingWebhooks++;
        break;
      case "duplicate_webhook":
        this.billingDuplicateWebhooks++;
        break;
    }
  }

  private calculatePercentiles(samples: number[]): LatencyPercentiles {
    if (samples.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const idx = Math.floor(sorted.length * (p / 100));
      return sorted[Math.min(idx, sorted.length - 1)];
    };

    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round((sum / sorted.length) * 10) / 10,
    };
  }

  /**
   * Produce comprehensive system telemetry snapshot
   */
  public getMetricsSnapshot(): SystemMetricsSnapshot {
    const errorCount = this.clientError4xx + this.serverError5xx;
    const errorRate = this.totalRequests > 0 ? (errorCount / this.totalRequests) * 100 : 0;

    const totalPubs = this.releasesPublished + this.rollbacksExecuted;
    const pubSuccessRate = totalPubs > 0 ? (this.releasesPublished / totalPubs) * 100 : 100;

    const avgAiDuration =
      this.aiDurations.length > 0
        ? Math.round(
            this.aiDurations.reduce((a, b) => a + b, 0) / this.aiDurations.length
          )
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      requests: {
        total: this.totalRequests,
        success2xx: this.success2xx,
        clientError4xx: this.clientError4xx,
        serverError5xx: this.serverError5xx,
        errorRate: Math.round(errorRate * 100) / 100,
        latency: this.calculatePercentiles(this.latencies),
      },
      ai: {
        totalGenerations: this.aiTotalGenerations,
        successfulGenerations: this.aiSuccess,
        failedGenerations: this.aiFailures,
        totalCreditsDebited: this.aiCreditsDebited,
        avgGenerationDurationMs: avgAiDuration,
      },
      publishing: {
        releasesPublished: this.releasesPublished,
        rollbacksExecuted: this.rollbacksExecuted,
        publishSuccessRate: Math.round(pubSuccessRate * 100) / 100,
      },
      domains: {
        registrations: this.domainRegistrations,
        verifications: this.domainVerifications,
        transfers: this.domainTransfers,
        renewals: this.domainRenewals,
        failures: this.domainFailures,
      },
      billing: {
        checkouts: this.billingCheckouts,
        webhooksProcessed: this.billingWebhooks,
        duplicateWebhooksIgnored: this.billingDuplicateWebhooks,
      },
    };
  }

  public reset(): void {
    this.startTime = Date.now();
    this.latencies = [];
    this.totalRequests = 0;
    this.success2xx = 0;
    this.clientError4xx = 0;
    this.serverError5xx = 0;
    this.aiTotalGenerations = 0;
    this.aiSuccess = 0;
    this.aiFailures = 0;
    this.aiCreditsDebited = 0;
    this.aiDurations = [];
    this.releasesPublished = 0;
    this.rollbacksExecuted = 0;
    this.domainRegistrations = 0;
    this.domainVerifications = 0;
    this.domainTransfers = 0;
    this.domainRenewals = 0;
    this.domainFailures = 0;
    this.billingCheckouts = 0;
    this.billingWebhooks = 0;
    this.billingDuplicateWebhooks = 0;
  }
}

export const metricsCollector = new MetricsCollector();
