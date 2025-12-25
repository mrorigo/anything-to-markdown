import { readFile } from 'fs/promises';
import * as pdfParse from 'pdf-parse';
import { DocumentConverter, DocumentConverterResult, ConvertOptions } from '../types';

const ParserClass = (pdfParse as any).PDFParse;
export class PdfConverter extends DocumentConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    // Bail if not a PDF
    const extension = options.fileExtension || '';
    if (extension.toLowerCase() !== '.pdf') {
      return null;
    }

    try {
      const dataBuffer = await readFile(localPath);

      const parser = new ParserClass({ data: dataBuffer });
      const pdfInfo = await parser.getInfo({ parsePageInfo: true });
      const pdfText = await parser.getText();

      return {
        title: pdfInfo?.info.Title || null,
        author: pdfInfo?.info.Author || null,
        creator: pdfInfo?.info.Creator || null,
        producer: pdfInfo?.info.Producer || null,
        pages: pdfInfo?.total || 0,
        textContent: pdfText.text,
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error}`);
    }
  }
}