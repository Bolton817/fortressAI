import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { EmailAdapter, SendEmailOptions, SendEmailResult } from "./email-adapter";

/**
 * Fortress AI — Mock Email Adapter (TDD §25.1, §25.2, FR-072)
 * Persists sent messages to memory and .data/sent-emails/ for automated test assertions.
 */

export interface RecordedEmailMessage extends SendEmailOptions {
  messageId: string;
  sentAt: string;
}

export class MockEmailAdapter implements EmailAdapter {
  public readonly providerName = "mock-brevo";
  private sentMessages: RecordedEmailMessage[] = [];
  private dataDir: string;

  constructor(customDataDir?: string) {
    this.dataDir = customDataDir || path.join(process.cwd(), ".data", "sent-emails");
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch {
      // Memory fallback
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const messageId = `msg_${randomUUID()}`;
    const sentAt = new Date().toISOString();

    const record: RecordedEmailMessage = {
      ...options,
      messageId,
      sentAt,
    };

    this.sentMessages.push(record);

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.dataDir, `${messageId}.json`),
        JSON.stringify(record, null, 2),
        "utf-8"
      );
    } catch {
      // Memory fallback
    }

    return {
      success: true,
      messageId,
      provider: this.providerName,
      timestamp: sentAt,
    };
  }

  getSentMessages(): RecordedEmailMessage[] {
    return [...this.sentMessages];
  }

  findMessagesTo(email: string): RecordedEmailMessage[] {
    const norm = email.trim().toLowerCase();
    return this.sentMessages.filter(
      (m) => m.to.email.trim().toLowerCase() === norm
    );
  }

  getLastMessageTo(email: string): RecordedEmailMessage | undefined {
    const msgs = this.findMessagesTo(email);
    return msgs[msgs.length - 1];
  }

  clear() {
    this.sentMessages = [];
    try {
      if (fs.existsSync(this.dataDir)) {
        const files = fs.readdirSync(this.dataDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.dataDir, file));
        }
      }
    } catch {
      // Safe ignore
    }
  }
}

export const mockEmailAdapter = new MockEmailAdapter();
