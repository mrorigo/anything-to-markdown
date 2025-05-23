import axios, { AxiosResponse } from 'axios';
import { readFile, mkdtemp, unlink, writeFile, rmdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { lookup } from 'mime-types';
import { 
  DocumentConverter, 
  DocumentConverterResult, 
  ConvertOptions, 
  ConversionSource 
} from './types';
import { PlainTextConverter } from './converters/plain-text-converter';
import { HtmlConverter } from './converters/html-converter';
import { WikipediaConverter } from './converters/wikipedia-converter';
import { YouTubeConverter } from './converters/youtube-converter';
import { PdfConverter } from './converters/pdf-converter';
import { FileConversionException, UnsupportedFormatException } from './exceptions';

export class MarkdownConverter {
  private pageConverters: DocumentConverter[] = [];
  private axiosInstance: typeof axios;

  constructor(axiosInstance?: typeof axios) {
    this.axiosInstance = axiosInstance || axios;

    // Register converters for successful browsing operations
    // Later registrations are tried first / take higher priority than earlier registrations
    // To this end, the most specific converters should appear below the most generic converters
    this.registerPageConverter(new PlainTextConverter());
    this.registerPageConverter(new HtmlConverter());
    this.registerPageConverter(new WikipediaConverter());
    this.registerPageConverter(new YouTubeConverter());
    this.registerPageConverter(new PdfConverter());
  }

  async convert(source: ConversionSource, options: ConvertOptions = {}): Promise<DocumentConverterResult> {
    if (typeof source === 'string') {
      if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('file://')) {
        return this.convertUrl(source, options);
      } else {
        return this.convertLocal(source, options);
      }
    } else {
      // AxiosResponse
      return this.convertResponse(source, options);
    }
  }

  async convertLocal(path: string, options: ConvertOptions = {}): Promise<DocumentConverterResult> {
    // Prepare a list of extensions to try (in order of priority)
    const extensions: (string | null)[] = [];
    
    if (options.fileExtension) {
      extensions.push(options.fileExtension);
    }

    // Get extension from the path
    const pathParts = path.split('.');
    if (pathParts.length > 1) {
      const ext = '.' + pathParts[pathParts.length - 1];
      this._appendExt(extensions, ext);
    }

    // Convert
    return this._convert(path, extensions, options);
  }

  async convertUrl(url: string, options: ConvertOptions = {}): Promise<DocumentConverterResult> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0';
    
    try {
      const response = await this.axiosInstance.get(url, {
        headers: { 'User-Agent': userAgent },
        responseType: 'arraybuffer',
      });
      return this.convertResponse(response, { ...options, url });
    } catch (error) {
      throw new Error(`Failed to fetch URL: ${error}`);
    }
  }

  async convertResponse(response: AxiosResponse, options: ConvertOptions = {}): Promise<DocumentConverterResult> {
    // Prepare a list of extensions to try (in order of priority)
    const extensions: (string | null)[] = [];
    
    if (options.fileExtension) {
      extensions.push(options.fileExtension);
    }

    // Guess from the mimetype
    const contentType = (response.headers['content-type'] || '').split(';')[0];
    if (contentType) {
      const ext = lookup(contentType);
      if (ext) {
        this._appendExt(extensions, '.' + ext);
      }
    }

    // Read the content disposition if there is one
    const contentDisposition = response.headers['content-disposition'] || '';
    const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
    if (filenameMatch) {
      const filename = filenameMatch[1].replace(/['"]/g, '');
      const pathParts = filename.split('.');
      if (pathParts.length > 1) {
        const ext = '.' + pathParts[pathParts.length - 1];
        this._appendExt(extensions, ext);
      }
    }

    // Read from the extension from the path
    try {
      const urlObj = new URL(response.config?.url || '');
      const pathParts = urlObj.pathname.split('.');
      if (pathParts.length > 1) {
        const ext = '.' + pathParts[pathParts.length - 1];
        this._appendExt(extensions, ext);
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Save the file locally to a temporary file
    const tempDir = await mkdtemp(join(tmpdir(), 'markdown-converter-'));
    const tempPath = join(tempDir, 'temp-file');
    
    let result: DocumentConverterResult;
    try {
      await writeFile(tempPath, response.data);
      
      // Convert
      result = await this._convert(tempPath, extensions, { ...options, url: response.config?.url });
    } finally {
      // Clean up temporary file and directory
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      try {
        await rmdir(tempDir);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    return result;
  }

  private async _convert(
    localPath: string, 
    extensions: (string | null)[], 
    options: ConvertOptions = {}
  ): Promise<DocumentConverterResult> {
    let errorTrace = '';
    
    const extensionsToTry = [...extensions, null]; // Try last with no extension
    
    for (const ext of extensionsToTry) {
      for (const converter of this.pageConverters) {
        const converterOptions = { ...options };
        
        // Overwrite file_extension appropriately
        if (ext === null) {
          delete converterOptions.fileExtension;
        } else {
          converterOptions.fileExtension = ext;
        }

        try {
          const result = await converter.convert(localPath, converterOptions);
          if (result !== null) {
            // Normalize the content
            result.textContent = result.textContent
              .split(/\r?\n/)
              .map(line => line.trimRight())
              .join('\n')
              .replace(/\n{3,}/g, '\n\n');

            return result;
          }
        } catch (error) {
          errorTrace = `\n\n${error}`;
        }
      }
    }

    // If we got this far without success, report any exceptions
    if (errorTrace.length > 0) {
      throw new FileConversionException(
        `Could not convert '${localPath}' to Markdown. File type was recognized as ${extensions}. While converting the file, the following error was encountered:${errorTrace}`
      );
    }

    // Nothing can handle it!
    throw new UnsupportedFormatException(
      `Could not convert '${localPath}' to Markdown. The formats ${extensions} are not supported.`
    );
  }

  private _appendExt(extensions: (string | null)[], ext: string | null): void {
    if (ext === null || ext === undefined) {
      return;
    }
    
    const trimmedExt = ext.trim();
    if (trimmedExt === '') {
      return;
    }
    
    extensions.push(trimmedExt);
  }

  registerPageConverter(converter: DocumentConverter): void {
    this.pageConverters.unshift(converter);
  }
}

// Re-export everything for convenience
export * from './types';
export * from './exceptions';
export * from './converters/plain-text-converter';
export * from './converters/html-converter';
export * from './converters/wikipedia-converter';
export * from './converters/youtube-converter';
export * from './converters/pdf-converter';