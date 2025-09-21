import { promises as fs } from 'fs';
import path from 'path';
import { geminiOCRService, OCRResult } from './gemini-ocr';

export interface ProcessingResult {
  success: boolean;
  data?: OCRResult;
  error?: string;
  filename: string;
  processingTime: number;
}

export class PDFProcessingService {
  private uploadDir: string;
  private maxFileSize: number; // 10MB
  private allowedTypes: string[];

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'invoices');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async processFile(
    file: Buffer,
    filename: string,
    mimetype: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate file
      this.validateFile(file, mimetype);

      // Generate unique filename
      const uniqueFilename = this.generateUniqueFilename(filename);
      const filePath = path.join(this.uploadDir, uniqueFilename);

      // Save file temporarily
      await fs.writeFile(filePath, file);

      let ocrResult: OCRResult;

      // Process based on file type
      if (mimetype === 'application/pdf') {
        ocrResult = await geminiOCRService.extractInvoiceData(file, filename);
      } else if (mimetype.startsWith('image/')) {
        ocrResult = await geminiOCRService.extractFromImage(file, mimetype);
      } else {
        throw new Error(`Unsupported file type: ${mimetype}`);
      }

      // Clean up temporary file
      await fs.unlink(filePath);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: ocrResult,
        filename: uniqueFilename,
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        filename,
        processingTime
      };
    }
  }

  // Legacy method name for backward compatibility
  async processPDFFile(
    file: Buffer,
    filename: string,
    mimetype: string
  ): Promise<ProcessingResult> {
    return this.processFile(file, filename, mimetype);
  }

  async processMultipleFiles(files: Array<{
    buffer: Buffer;
    filename: string;
    mimetype: string;
  }>): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    for (const file of files) {
      const result = await this.processFile(
        file.buffer,
        file.filename,
        file.mimetype
      );
      results.push(result);
    }

    return results;
  }

  private validateFile(file: Buffer, mimetype: string): void {
    if (file.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    if (!this.allowedTypes.includes(mimetype)) {
      throw new Error(`File type ${mimetype} is not supported. Allowed types: ${this.allowedTypes.join(', ')}`);
    }
  }

  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    
    // Sanitize filename
    const sanitizedName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${timestamp}_${random}_${sanitizedName}${ext}`;
  }

  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
      return 0;
    }
  }

  async getProcessingStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    try {
      const files = await fs.readdir(this.uploadDir);
      let totalSize = 0;
      let oldestFile: Date | undefined;
      let newestFile: Date | undefined;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        
        totalSize += stats.size;
        
        if (!oldestFile || stats.mtime < oldestFile) {
          oldestFile = stats.mtime;
        }
        
        if (!newestFile || stats.mtime > newestFile) {
          newestFile = stats.mtime;
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0
      };
    }
  }
}

export const pdfProcessingService = new PDFProcessingService();