# Markdown Converter (TypeScript)

A TypeScript port of a document-to-markdown converter that transforms various file formats and web content into clean, readable Markdown text. Originally inspired by Microsoft's Autogen Magentic-One project.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Multiple Input Sources**: Convert local files, URLs, or HTTP responses
- **Comprehensive Format Support**: 
  - Plain text files
  - HTML documents with intelligent content extraction
  - PDF documents (text-based)
  - Wikipedia pages (specialized extraction)
  - YouTube pages (metadata and description extraction)
- **Clean Markdown Output**: Removes scripts, styles, and formatting noise
- **Extensible Architecture**: Easy to add new converters
- **Command Line Interface**: Simple CLI for batch processing
- **TypeScript Native**: Fully typed with strict TypeScript compliance

## Installation

For development:
```bash
git clone <repository-url>
cd anything-to-markdown
npm install
npm run build
```

## Quick Start

### Programmatic Usage

```typescript
import { MarkdownConverter } from 'anything-to-markdown';

const converter = new MarkdownConverter();

// Convert a local file
const result = await converter.convertLocal('document.pdf');
console.log(result.title);       // Document title (if available)
console.log(result.textContent); // Markdown content

// Convert a URL
const webResult = await converter.convertUrl('https://en.wikipedia.org/wiki/TypeScript');

// Convert with specific options
const htmlResult = await converter.convert('file.html', {
  fileExtension: '.html'
});
```

### Command Line Usage

```bash
# Convert a PDF file
node dist/cli.js document.pdf

# Convert a URL and save to file
node dist/cli.js https://example.com -o output.md

# Convert with verbose output
node dist/cli.js document.html -v

# Force file type detection
node dist/cli.js file.txt -e .html
```

## Supported Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| **Plain Text** | `.txt` | Direct text extraction |
| **HTML** | `.html`, `.htm` | Converts HTML to Markdown, removes scripts/styles |
| **PDF** | `.pdf` | Extracts text content and metadata |
| **Wikipedia** | `.html` (special) | Specialized Wikipedia page parsing |
| **YouTube** | `.html` (special) | Extracts video metadata and description |

## Architecture

### Core Components

```
src/
├── markdown-converter.ts    # Main orchestrator class
├── types.ts                 # TypeScript interfaces and types
├── exceptions.ts            # Custom error classes
├── converters/              # Individual format converters
│   ├── plain-text-converter.ts
│   ├── html-converter.ts
│   ├── pdf-converter.ts
│   ├── wikipedia-converter.ts
│   └── youtube-converter.ts
├── cli.ts                   # Command line interface
└── __tests__/               # Test suites
```

### Custom Converters

Create your own converter by extending the `DocumentConverter` class:

```typescript
import { DocumentConverter, DocumentConverterResult, ConvertOptions } from 'anything-to-markdown';

class CustomConverter extends DocumentConverter {
  async convert(localPath: string, options: ConvertOptions = {}): Promise<DocumentConverterResult | null> {
    // Return null if this converter can't handle the file
    if (options.fileExtension !== '.custom') {
      return null;
    }

    // Process the file and return result
    return {
      title: 'Custom Document',
      textContent: 'Converted content...'
    };
  }
}

// Register the converter
const converter = new MarkdownConverter();
converter.registerPageConverter(new CustomConverter());
```

## API Reference

### MarkdownConverter

#### Methods

- **`convert(source, options?)`** - Main conversion method
  - `source`: File path, URL, or AxiosResponse
  - `options`: Conversion options (file extension, etc.)
  - Returns: `Promise<DocumentConverterResult>`

- **`convertLocal(path, options?)`** - Convert local file
- **`convertUrl(url, options?)`** - Convert from URL
- **`convertResponse(response, options?)`** - Convert HTTP response
- **`registerPageConverter(converter)`** - Add custom converter

#### Options

```typescript
interface ConvertOptions {
  fileExtension?: string;  // Force file type detection
  url?: string;           // Original URL (for context)
  [key: string]: any;     // Additional converter-specific options
}
```

#### Result

```typescript
interface DocumentConverterResult {
  title: string | null;    // Document title (if available)
  textContent: string;     // Markdown content
}
```

## Command Line Interface

```bash
markdown-converter <source> [options]

Arguments:
  source                    File path or URL to convert

Options:
  -o, --output <file>      Output file (default: stdout)
  -v, --verbose            Show verbose output
  -e, --extension <ext>    Force file extension (e.g., .html, .pdf)
  -h, --help               Display help information
  -V, --version            Display version number
```

### CLI Examples

```bash
# Basic conversion
node dist/cli.js document.pdf

# Save to file
node dist/cli.js https://en.wikipedia.org/wiki/Node.js -o nodejs.md

# Force HTML processing
node dist/cli.js data.xml -e .html

# Verbose output for debugging
node dist/cli.js complex-document.pdf -v

# YouTube video information
node dist/cli.js "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -o video-info.md
```

## Development

### Setup

```bash
git clone <repository-url>
cd anything-to-markdown
npm install
```

### Scripts

```bash
npm run build       # Compile TypeScript
npm run dev         # Watch mode compilation
npm run test        # Run test suite
npm run lint        # ESLint check
npm run format      # Prettier formatting
npm run cli         # Run CLI during development
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test html-converter.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Adding New Converters

1. Create a new converter class in `src/converters/`
2. Extend `DocumentConverter` and implement the `convert` method
3. Register the converter in `MarkdownConverter` constructor
4. Add tests in `src/__tests__/`
5. Update documentation

## Dependencies

### Runtime
- **axios** - HTTP client for URL fetching
- **cheerio** - HTML parsing and manipulation
- **turndown** - HTML to Markdown conversion
- **pdf-parse** - PDF text extraction
- **mime-types** - MIME type detection
- **commander** - CLI framework

### Development
- **TypeScript** - Type-safe JavaScript
- **Jest** - Testing framework
- **ts-jest** - TypeScript support for Jest
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Error Handling

The converter provides specific error types:

```typescript
import { FileConversionException, UnsupportedFormatException } from 'anything-to-markdown';

try {
  const result = await converter.convert('file.xyz');
} catch (error) {
  if (error instanceof UnsupportedFormatException) {
    console.log('File format not supported');
  } else if (error instanceof FileConversionException) {
    console.log('Conversion failed:', error.message);
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Guidelines

- Follow TypeScript strict mode requirements
- Add tests for new converters
- Update documentation for API changes
- Use Prettier for code formatting
- Follow existing code patterns

## Limitations

- **PDF Support**: Works best with text-based PDFs; scanned documents may not extract well
- **YouTube Transcripts**: Currently extracts metadata only; transcript extraction requires additional implementation
- **Image Content**: No OCR support for images within documents
- **JavaScript Content**: Dynamic content requiring JavaScript execution is not supported

## Roadmap

- [ ] DOCX file support
- [ ] Excel/CSV file support  
- [ ] Image OCR capabilities
- [ ] YouTube transcript extraction
- [ ] PowerPoint presentation support
- [ ] Audio file transcription
- [ ] Archive file handling (ZIP, etc.)
- [ ] Improved PDF extraction

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Microsoft's [Autogen Magentic-One](https://github.com/microsoft/autogen) project
- Built with modern TypeScript and Node.js ecosystem tools
- Thanks to the open-source community for the excellent libraries used