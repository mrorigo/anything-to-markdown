import { readFile } from 'fs/promises';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { DocumentConverter, DocumentConverterResult, ConvertOptions } from '../types';

export class CustomTurndownService extends TurndownService {
  constructor() {
    super({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    // Custom rule for links to remove javascript and escape URIs
    this.addRule('links', {
      filter: 'a',
      replacement: (content: string, node: any) => {
        const href = node.getAttribute('href');
        const title = node.getAttribute('title');

        if (!content.trim()) {
          return '';
        }

        // Skip non-http or file schemes (like javascript:)
        if (href) {
          try {
            const url = new URL(href, 'http://example.com');
            if (url.protocol && !['http:', 'https:', 'file:'].includes(url.protocol)) {
              return content;
            }
          } catch {
            return content;
          }
        }

        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
        return href ? `[${content}](${href}${titlePart})` : content;
      },
    });

    // Custom rule for images to truncate data URIs
    this.addRule('images', {
      filter: 'img',
      replacement: (content: string, node: any) => {
        const alt = node.getAttribute('alt') || '';
        let src = node.getAttribute('src') || '';
        const title = node.getAttribute('title') || '';

        // Remove dataURIs
        if (src.startsWith('data:')) {
          src = src.split(',')[0] + '...';
        }

        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
        return `![${alt}](${src}${titlePart})`;
      },
    });
  }
}

export class HtmlConverter extends DocumentConverter {
  public turndownService: CustomTurndownService;

  constructor() {
    super();
    this.turndownService = new CustomTurndownService();
  }

  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    const extension = options.fileExtension || '';
    if (!['.html', '.htm'].includes(extension.toLowerCase())) {
      return null;
    }

    try {
      const htmlContent = await readFile(localPath, 'utf-8');
      return this._convert(htmlContent);
    } catch (error) {
      throw new Error(`Failed to read HTML file: ${error}`);
    }
  }

  protected _convert(htmlContent: string): DocumentConverterResult {
    const $ = cheerio.load(htmlContent);

    // Remove javascript and style blocks
    $('script, style').remove();

    // Get title
    const title = $('title').text() || null;

    // Get main content
    const body = $('body');
    const contentHtml = body.length > 0 ? body.html() || '' : $.html();

    // Convert to markdown
    const webpageText = this.turndownService.turndown(contentHtml);

    return {
      title,
      textContent: webpageText,
    };
  }
}
