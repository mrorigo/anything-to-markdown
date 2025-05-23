import { readFile } from 'fs/promises';
import { lookup } from 'mime-types';
import { DocumentConverter, DocumentConverterResult, ConvertOptions } from '../types';

export class PlainTextConverter extends DocumentConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    // Guess the content type from any file extension that might be around
    const contentType = lookup(`__placeholder${options.fileExtension || ''}`);

    // Only accept text files
    if (!contentType) {
      return null;
    }
    // Check if the content type is a text format
    if (!contentType.startsWith('text/')) {
      return null;
    }

    try {
      const textContent = await readFile(localPath, 'utf-8');
      return {
        title: null,
        textContent,
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }
}