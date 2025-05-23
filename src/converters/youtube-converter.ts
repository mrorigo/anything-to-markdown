import { readFile } from 'fs/promises';
import * as cheerio from 'cheerio';
import { HtmlConverter } from './html-converter';
import { DocumentConverterResult, ConvertOptions } from '../types';

interface YoutubeMetadata {
  [key: string]: string;
}

export class YouTubeConverter extends HtmlConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    const extension = options.fileExtension || '';
    if (!['.html', '.htm'].includes(extension.toLowerCase())) {
      return null;
    }

    const url = options.url || '';
    if (!url.startsWith('https://www.youtube.com/watch?')) {
      return null;
    }

    try {
      const htmlContent = await readFile(localPath, 'utf-8');
      const $ = cheerio.load(htmlContent);

      // Read the meta tags
      const metadata: YoutubeMetadata = {
        title: $('title').text() || '',
      };

      $('meta').each((_, element) => {
        const $meta = $(element);
        const attrs = ['itemprop', 'property', 'name'];
        
        for (const attr of attrs) {
          const attrValue = $meta.attr(attr);
          if (attrValue) {
            metadata[attrValue] = $meta.attr('content') || '';
            break;
          }
        }
      });

      // Try to read the full description from ytInitialData
      try {
        $('script').each((_, script) => {
          const content = $(script).html() || '';
          if (content.includes('ytInitialData')) {
            const lines = content.split(/\r?\n/);
            const objStart = lines[0].indexOf('{');
            const objEnd = lines[0].lastIndexOf('}');
            if (objStart >= 0 && objEnd >= 0) {
              try {
                const data = JSON.parse(lines[0].substring(objStart, objEnd + 1));
                const attrdesc = this._findKey(data, 'attributedDescriptionBodyText');
                if (attrdesc && attrdesc.content) {
                  metadata.description = String(attrdesc.content);
                }
              } catch {
                // Ignore JSON parse errors
              }
            }
            return false; // Break out of each loop
          }
        });
      } catch {
        // Ignore errors when parsing ytInitialData
      }

      // Start preparing the page
      let webpageText = '# YouTube\n';

      const title = this._get(metadata, ['title', 'og:title', 'name']);
      if (title) {
        webpageText += `\n## ${title}\n`;
      }

      let stats = '';
      const views = this._get(metadata, ['interactionCount']);
      if (views) {
        stats += `- **Views:** ${views}\n`;
      }

      const keywords = this._get(metadata, ['keywords']);
      if (keywords) {
        stats += `- **Keywords:** ${keywords}\n`;
      }

      const runtime = this._get(metadata, ['duration']);
      if (runtime) {
        stats += `- **Runtime:** ${runtime}\n`;
      }

      if (stats.length > 0) {
        webpageText += `\n### Video Metadata\n${stats}\n`;
      }

      const description = this._get(metadata, ['description', 'og:description']);
      if (description) {
        webpageText += `\n### Description\n${description}\n`;
      }

      // Note: YouTube transcript extraction would require additional libraries
      // and API calls. For now, we'll leave a placeholder comment.
      // TODO: Implement YouTube transcript extraction using youtube-transcript library or similar
      
      const finalTitle = title || $('title').text();

      return {
        title: finalTitle,
        textContent: webpageText,
      };
    } catch (error) {
      throw new Error(`Failed to process YouTube page: ${error}`);
    }
  }

  private _get(metadata: YoutubeMetadata, keys: string[], defaultValue: string | null = null): string | null {
    for (const key of keys) {
      if (key in metadata) {
        return metadata[key];
      }
    }
    return defaultValue;
  }

  private _findKey(json: any, key: string): any {
    if (Array.isArray(json)) {
      for (const elm of json) {
        const ret = this._findKey(elm, key);
        if (ret !== null) {
          return ret;
        }
      }
    } else if (json && typeof json === 'object') {
      for (const k in json) {
        if (k === key) {
          return json[k];
        } else {
          const ret = this._findKey(json[k], key);
          if (ret !== null) {
            return ret;
          }
        }
      }
    }
    return null;
  }
}
