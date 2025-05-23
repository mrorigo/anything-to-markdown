import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse';
import { DocumentConverter, DocumentConverterResult, ConvertOptions } from '../types';

export class PdfConverter extends DocumentConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    // Bail if not a PDF
    const extension = options.fileExtension || '';
    if (extension.toLowerCase() !== '.pdf') {
      return null;
    }

    try {
      const dataBuffer = await readFile(localPath);
      const pdfData = await pdfParse(dataBuffer);
      
      return {
        title: pdfData.info?.Title || null,
        textContent: pdfData.text,
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error}`);
    }
  }
}