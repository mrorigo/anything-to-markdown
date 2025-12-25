#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { MarkdownConverter } from './markdown-converter';
import { FileConversionException, UnsupportedFormatException } from './exceptions';

const program = new Command();

interface CliOptions {
  output?: string;
  verbose?: boolean;
  extension?: string;
  frontmatter?: boolean; // default: true (use --no-frontmatter to set false)
}

async function convertSource(source: string, options: CliOptions): Promise<void> {
  const converter = new MarkdownConverter();

  try {
    if (options.verbose) {
      console.error(`Converting: ${source}`);
    }

    const convertOptions = options.extension ? { fileExtension: options.extension } : {};
    const result = await converter.convert(source, convertOptions);

    // Prepare body of the markdown output
    let body = '';
    if (result.title) {
      body += `# ${result.title}\n\n`;
    }
    body += result.textContent;

    // Prepare optional YAML frontmatter
    let output = '';
    if (options.frontmatter !== false) {
      const meta: { [k: string]: string } = {};
      meta.converted_at = new Date().toISOString();

      if (result.title) {
        meta.title = result.title;
      }

      if (source && (source.startsWith('http://') || source.startsWith('https://'))) {
        meta.url = source;
      } else if (source) {
        meta.source = source;
      }

      if (options.extension) {
        meta.file_extension = options.extension;
      }

      // Include additional metadata if provided by converters (common for PDFs)
      if ((result as any).pages != null) {
        meta.pages = String((result as any).pages);
      }
      if ((result as any).author != null) {
        meta.author = String((result as any).author);
      }
      if ((result as any).creator != null) {
        meta.creator = String((result as any).creator);
      }
      if ((result as any).producer != null) {
        meta.producer = String((result as any).producer);
      }

      const yamlLines = Object.entries(meta)
        .map(([k, v]) => `${k}: "${String(v).replace(/"/g, '\\"')}"`)
        .join('\n');

      output += `---\n${yamlLines}\n---\n\n`;
    }

    output += body;

    // Write to file or stdout
    if (options.output) {
      await fs.writeFile(options.output, output, 'utf-8');
      if (options.verbose) {
        console.error(`Output written to: ${options.output}`);
      }
    } else {
      console.log(output);
    }

    if (options.verbose) {
      console.error('Conversion completed successfully');
    }

  } catch (error) {
    if (error instanceof UnsupportedFormatException) {
      console.error(`Error: Unsupported file format - ${error.message}`);
      process.exit(2);
    } else if (error instanceof FileConversionException) {
      console.error(`Error: Conversion failed - ${error.message}`);
      process.exit(3);
    } else {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  }
}

program
  .name('markdown-converter')
  .description('Convert documents and web pages to Markdown')
  .version('1.0.0')
  .argument('<source>', 'File path or URL to convert')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-v, --verbose', 'Show verbose output')
  .option('-e, --extension <ext>', 'Force file extension (e.g., .html, .pdf)')
  .option('--no-frontmatter', 'Do not include YAML frontmatter in output')
  .action(async (source: string, options: CliOptions) => {
    await convertSource(source, options);
  });

// Add examples to help
program.addHelpText('after', `
Examples:
  $ markdown-converter document.pdf
  $ markdown-converter https://en.wikipedia.org/wiki/TypeScript
  $ markdown-converter document.html -o output.md
  $ markdown-converter file.txt -e .html -v
  $ markdown-converter https://www.youtube.com/watch?v=dQw4w9WgXcQ
`);

// Parse command line arguments
program.parse();