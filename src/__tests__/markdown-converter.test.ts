import { MarkdownConverter } from '../markdown-converter';
import { DocumentConverter, DocumentConverterResult, ConvertOptions } from '../types';
import { UnsupportedFormatException } from '../exceptions';
import { promises as fs } from 'fs';
import * as path from 'path';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a mock document converter for testing
class MockTextConverter extends DocumentConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    if (options.fileExtension !== '.mock') {
      return null;
    }
    
    try {
      const content = await fs.readFile(localPath, 'utf-8');
      return {
        title: 'Mock Document',
        textContent: `Converted: ${content}`,
      };
    } catch (error) {
      return null;
    }
  }
}

describe('MarkdownConverter', () => {
  // Setup test files
  const testDir = path.join(__dirname, 'test-files');
  const textFilePath = path.join(testDir, 'test.txt');
  const mockFilePath = path.join(testDir, 'test.mock');
  const textContent = 'This is a test file.';

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(textFilePath, textContent);
    await fs.writeFile(mockFilePath, textContent);
  });

  afterAll(async () => {
    await fs.unlink(textFilePath);
    await fs.unlink(mockFilePath);
    await fs.rmdir(testDir);
  });

  describe('convertLocal', () => {
    it('should convert a local file using the appropriate converter', async () => {
      const converter = new MarkdownConverter();
      const result = await converter.convertLocal(textFilePath);
      
      expect(result).toHaveProperty('textContent');
      expect(result.textContent).toContain(textContent);
    });

    it('should throw UnsupportedFormatException for unsupported formats', async () => {
      const converter = new MarkdownConverter();
      
      // Create a file with an unknown extension
      const unknownFile = path.join(testDir, 'test.xyz');
      await fs.writeFile(unknownFile, 'unknown content');
      
      try {
        await expect(
          converter.convertLocal(unknownFile)
        ).rejects.toThrow(UnsupportedFormatException);
      } finally {
        await fs.unlink(unknownFile);
      }
    });
  });

  describe('convertUrl', () => {
    it('should convert content from a URL', async () => {
      const converter = new MarkdownConverter();
      
      // Mock the convertResponse method instead of axios directly
      const mockResult: DocumentConverterResult = {
        title: 'Test Document',
        textContent: textContent
      };
      
      const convertResponseSpy = jest.spyOn(converter, 'convertResponse');
      convertResponseSpy.mockResolvedValueOnce(mockResult);
      
      const result = await converter.convertUrl('https://example.com/text.txt');
      
      expect(result).toEqual(mockResult);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/text.txt',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          }),
          responseType: 'arraybuffer'
        })
      );
      
      convertResponseSpy.mockRestore();
    });

    it('should handle HTTP errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      const converter = new MarkdownConverter();
      
      await expect(
        converter.convertUrl('https://example.com/nonexistent.txt')
      ).rejects.toThrow('Failed to fetch URL');
    });
  });

  describe('convertResponse', () => {
    it('should convert response data to markdown', async () => {
      const converter = new MarkdownConverter();
      const responseData = Buffer.from(textContent, 'utf-8');
      
      const mockResponse = {
        data: responseData,
        headers: {
          'content-type': 'text/plain'
        },
        status: 200,
        statusText: 'OK',
        config: {
          url: 'https://example.com/text.txt'
        }
      } as any;

      const result = await converter.convertResponse(mockResponse);
      
      expect(result).toHaveProperty('textContent');
      expect(result.textContent).toBe(textContent);
    });
  });

  describe('registerPageConverter', () => {
    it('should use a custom registered converter', async () => {
      const converter = new MarkdownConverter();
      converter.registerPageConverter(new MockTextConverter());
      
      const result = await converter.convertLocal(mockFilePath, { fileExtension: '.mock' });
      
      expect(result).toHaveProperty('title', 'Mock Document');
      expect(result.textContent).toBe(`Converted: ${textContent}`);
    });

    it('should prioritize converters registered more recently', async () => {
      class FirstMockConverter extends DocumentConverter {
        async convert(): Promise<DocumentConverterResult | null> {
          return { title: 'First', textContent: 'First converter' };
        }
      }

      class SecondMockConverter extends DocumentConverter {
        async convert(): Promise<DocumentConverterResult | null> {
          return { title: 'Second', textContent: 'Second converter' };
        }
      }

      const converter = new MarkdownConverter();
      converter.registerPageConverter(new FirstMockConverter());
      converter.registerPageConverter(new SecondMockConverter());
      
      // Since SecondMockConverter was registered last, it should be used first
      const result = await converter.convert(textFilePath);
      
      expect(result.title).toBe('Second');
      expect(result.textContent).toBe('Second converter');
    });
  });

  describe('convert', () => {
    it('should handle string paths', async () => {
      const converter = new MarkdownConverter();
      const spy = jest.spyOn(converter, 'convertLocal');
      
      await converter.convert(textFilePath);
      
      expect(spy).toHaveBeenCalledWith(textFilePath, {});
    });

    it('should handle URLs', async () => {
      const converter = new MarkdownConverter();
      const spy = jest.spyOn(converter, 'convertUrl');
      
      // Mock implementation to avoid actual HTTP calls
      spy.mockImplementation(async () => ({ title: 'URL Test', textContent: 'URL content' }));
      
      await converter.convert('https://example.com/test.txt');
      
      expect(spy).toHaveBeenCalledWith('https://example.com/test.txt', {});
    });
  });
});