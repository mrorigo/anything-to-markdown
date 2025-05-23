import { PdfConverter } from '../converters/pdf-converter';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('PdfConverter', () => {
  const testPdfPath = path.join(__dirname, 'data', 'basic-text.pdf');
  const nonPdfPath = path.join(__dirname, 'test-non-pdf.txt');

  beforeAll(async () => {
    // Create a test non-PDF file
    await fs.writeFile(nonPdfPath, 'This is not a PDF file', 'utf-8');
    
    // Verify the test PDF exists
    try {
      await fs.access(testPdfPath);
    } catch (error) {
      throw new Error(`Test PDF file not found at ${testPdfPath}. Please ensure the test data file exists.`);
    }
  });

  afterAll(async () => {
    // Clean up the non-PDF test file
    try {
      await fs.unlink(nonPdfPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should convert a PDF file to DocumentConverterResult', async () => {
    const converter = new PdfConverter();
    const result = await converter.convert(testPdfPath, { fileExtension: '.pdf' });

    expect(result).not.toBeNull();
    expect(result?.textContent).toBeDefined();
    expect(result?.textContent.length).toBeGreaterThan(0);
    expect(typeof result?.textContent).toBe('string');
    
    // Title may or may not be present depending on the PDF
    expect(result?.title === null || typeof result?.title === 'string').toBe(true);
  });

  it('should return null for non-PDF file extensions', async () => {
    const converter = new PdfConverter();
    const result = await converter.convert(testPdfPath, { fileExtension: '.txt' });

    expect(result).toBeNull();
  });

  it('should return null for files without PDF extension', async () => {
    const converter = new PdfConverter();
    const result = await converter.convert(nonPdfPath, { fileExtension: '.txt' });

    expect(result).toBeNull();
  });

  it('should handle PDF parsing errors gracefully', async () => {
    const converter = new PdfConverter();
    
    // Try to parse a non-PDF file as PDF (should throw error)
    await expect(
      converter.convert(nonPdfPath, { fileExtension: '.pdf' })
    ).rejects.toThrow('Failed to parse PDF');
  });

  it('should handle missing files gracefully', async () => {
    const converter = new PdfConverter();
    const nonExistentPath = path.join(__dirname, 'does-not-exist.pdf');
    
    await expect(
      converter.convert(nonExistentPath, { fileExtension: '.pdf' })
    ).rejects.toThrow();
  });
});