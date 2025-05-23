import { PlainTextConverter } from '../converters/plain-text-converter';
import { DocumentConverterResult } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('PlainTextConverter', () => {
  const testFilePath = path.join(__dirname, 'test.txt');
  const testContent = 'Hello, this is a plain text file.\nSecond line!';

  beforeAll(async () => {
    await fs.writeFile(testFilePath, testContent, { encoding: 'utf-8' });
  });

  afterAll(async () => {
    await fs.unlink(testFilePath);
  });

  it('should convert a plain text file to DocumentConverterResult', async () => {
    const converter = new PlainTextConverter();
    const result = await converter.convert(testFilePath, { fileExtension: '.txt' });

    expect(result).not.toBeNull();
    expect(result?.title).toBeNull();
    expect(result?.textContent).toBe(testContent);
  });

  it('should return null for non-text file extension', async () => {
    const converter = new PlainTextConverter();
    const result = await converter.convert(testFilePath, { fileExtension: '.bin' });

    expect(result).toBeNull();
  });
});
