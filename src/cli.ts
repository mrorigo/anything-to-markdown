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
}

async function convertSource(source: string, options: CliOptions): Promise<void> {
  const converter = new MarkdownConverter();

  try {
    if (options.verbose) {
      console.error(`Converting: ${source}`);
    }

    const convertOptions = options.extension ? { fileExtension: options.extension } : {};
    const result = await converter.convert(source, convertOptions);

    // Prepare output
    let output = '';
    if (result.title) {
      output += `# ${result.title}\n\n`;
    }
    output += result.textContent;

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