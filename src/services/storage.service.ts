import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import logger from '../utils/logger';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

export interface IStorageService {
  writeStream(filePath: string): fs.WriteStream;
  readStream(filePath: string): fs.ReadStream;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): boolean;
  getFileSize(filePath: string): number;
}

export class LocalStorageService implements IStorageService {
  private static instance: LocalStorageService;
  private readonly storageRoot: string;

  private constructor() {
    this.storageRoot = path.join(process.cwd(), 'storage', 'reports');
    this.ensureStorageRoot();
  }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  private async ensureStorageRoot() {
    try {
      if (!fs.existsSync(this.storageRoot)) {
        await mkdir(this.storageRoot, { recursive: true });
        logger.info(`Initialized local storage root at ${this.storageRoot}`);
      }
    } catch (error) {
      logger.error('Failed to initialize local storage root:', error);
      throw error;
    }
  }

  private getAbsolutePath(relativePath: string): string {
    // Basic path traversal prevention
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.storageRoot, safePath);
  }

  public writeStream(relativePath: string): fs.WriteStream {
    const absolutePath = this.getAbsolutePath(relativePath);
    return fs.createWriteStream(absolutePath);
  }

  public readStream(relativePath: string): fs.ReadStream {
    const absolutePath = this.getAbsolutePath(relativePath);
    if (!this.fileExists(relativePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(absolutePath);
  }

  public async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);
    if (this.fileExists(relativePath)) {
      await unlink(absolutePath);
    }
  }

  public fileExists(relativePath: string): boolean {
    const absolutePath = this.getAbsolutePath(relativePath);
    return fs.existsSync(absolutePath);
  }

  public getFileSize(relativePath: string): number {
    const absolutePath = this.getAbsolutePath(relativePath);
    if (this.fileExists(relativePath)) {
      const stats = fs.statSync(absolutePath);
      return stats.size;
    }
    return 0;
  }
}
