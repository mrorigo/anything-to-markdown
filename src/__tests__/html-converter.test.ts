import { HtmlConverter } from '../converters/html-converter';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('HtmlConverter', () => {
  const testFilePath = path.join(__dirname, 'test.html');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test HTML Page</title>
        <style>body { color: red; }</style>
        <script>console.log('test');</script>
      </head>
      <body>
        <h1>Hello <em>World</em></h1>
        <p>This is a <a href="https://example.com">link</a>.</p>
        <img src="data:image/png;base64,AAA..." alt="test image" />
        <img src="https://example.com/image.jpg" alt="real image" title="Image Title"/>
      </body>
    </html>
  `;

  beforeAll(async () => {
    await fs.writeFile(testFilePath, htmlContent, { encoding: 'utf-8' });
  });

  afterAll(async () => {
    await fs.unlink(testFilePath);
  });

  it('should convert HTML to Markdown, removing scripts and styles', async () => {
    const converter = new HtmlConverter();
    const result = await converter.convert(testFilePath, { fileExtension: '.html' });

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test HTML Page');
    expect(result?.textContent).toContain('# Hello _World_');
    expect(result?.textContent).toContain('[link](https://example.com)');
    expect(result?.textContent).not.toMatch(/console\.log/);
    expect(result?.textContent).not.toMatch(/color: red/);

    // Images
    expect(result?.textContent).toContain('![test image](data:image/png;base64...)');
    expect(result?.textContent).toContain('![real image](https://example.com/image.jpg "Image Title")');
  });

  it('should return null for non-html extensions', async () => {
    const converter = new HtmlConverter();
    const result = await converter.convert(testFilePath, { fileExtension: '.txt' });
    expect(result).toBeNull();
  });
});