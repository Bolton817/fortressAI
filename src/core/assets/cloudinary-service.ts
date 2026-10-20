import { v2 as cloudinary } from "cloudinary";

/**
 * Fortress AI — Cloudinary Asset Service (TDD §14.1, §14.4)
 * Manages authenticated media uploads, transformations, and asset delivery.
 */

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: Record<string, any>;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  aspectRatio: string;
}

export class CloudinaryService {
  private isConfigured: boolean = false;

  constructor() {
    this.configure();
  }

  private configure(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "nh8mqfdn";
    const apiKey = process.env.CLOUDINARY_API_KEY || "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
    } else if (process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloudinary_url: process.env.CLOUDINARY_URL,
        secure: true,
      });
      this.isConfigured = true;
    }
  }

  /**
   * Tests connectivity to the Cloudinary API
   */
  public async ping(): Promise<{ status: "ok" | "error"; cloudName: string; details?: any }> {
    try {
      const res = await cloudinary.api.ping();
      return {
        status: res.status === "ok" ? "ok" : "error",
        cloudName: cloudinary.config().cloud_name || "nh8mqfdn",
        details: res,
      };
    } catch (err: any) {
      return {
        status: "error",
        cloudName: cloudinary.config().cloud_name || "unknown",
        details: err.message || err,
      };
    }
  }

  /**
   * Fetches current account usage and quotas
   */
  public async getUsage(): Promise<any> {
    return await cloudinary.api.usage();
  }

  /**
   * Generates an optimized, responsive delivery URL
   */
  public buildUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string | number;
      format?: string;
    } = {}
  ): string {
    const {
      width = 1200,
      crop = "fill",
      quality = "auto",
      format = "auto",
    } = options;

    if (publicId.startsWith("http")) {
      return `${publicId}&w=${width}&q=${quality === "auto" ? 80 : quality}`;
    }

    return cloudinary.url(publicId, {
      width,
      crop,
      quality,
      fetch_format: format,
      secure: true,
    });
  }

  /**
   * Uploads an image (Buffer, file path, or Data URI) to Cloudinary
   */
  public async upload(
    file: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions: Record<string, any> = {
      folder: options.folder || "fortress-ai/curated",
      resource_type: "image",
    };

    if (options.publicId) uploadOptions.public_id = options.publicId;
    if (options.tags) uploadOptions.tags = options.tags;
    if (options.transformation) uploadOptions.transformation = options.transformation;

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    const width = result.width || 1200;
    const height = result.height || 800;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    const aspectRatio = `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format,
      width,
      height,
      bytes: result.bytes,
      aspectRatio,
    };
  }
}

export const cloudinaryService = new CloudinaryService();
