import { readFile } from 'fs/promises';
import * as cheerio from 'cheerio';
import { HtmlConverter } from './html-converter';
import { DocumentConverterResult, ConvertOptions } from '../types';

export class WikipediaConverter extends HtmlConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    const extension = options.fileExtension || '';
    if (!['.html', '.htm'].includes(extension.toLowerCase())) {
      return null;
    }

    const url = options.url || '';
    if (!url.match(/^https?:\/\/[a-zA-Z]{2,3}\.wikipedia\.org\//)) {
      return null;
    }

    try {
      const htmlContent = await readFile(localPath, 'utf-8');
      const $ = cheerio.load(htmlContent);

      // Remove javascript and style blocks
      $('script, style').remove();

      // Get the main content and title
      const bodyElm = $('#mw-content-text');
      const titleElm = $('.mw-page-title-main');

      let webpageText = '';
      let mainTitle = $('title').text() || null;

      if (bodyElm.length > 0) {
        // Get the title
        if (titleElm.length > 0) {
          mainTitle = titleElm.text();
        }

        // Convert the page
        const bodyHtml = bodyElm.html() || '';
        const markdownContent = this.turndownService.turndown(bodyHtml);
        webpageText = `# ${mainTitle}\n\n${markdownContent}`;
      } else {
        // Fallback to converting the whole page
        webpageText = this.turndownService.turndown($.html());
      }

      return {
        title: mainTitle,
        textContent: webpageText,
      };
    } catch (error) {
      throw new Error(`Failed to process Wikipedia page: ${error}`);
    }
  }
}
