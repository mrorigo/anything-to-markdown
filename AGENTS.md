# Copilot Instructions for "anything-to-markdown"

Quick, actionable guidance to help an AI coding agent be immediately productive in this repository.

## Quick repo summary
- Purpose: Convert files / web pages to **clean Markdown** (plain text, HTML, PDF, Wikipedia, YouTube metadata).
- Key places to read: `src/markdown-converter.ts` (orchestration), `src/converters/` (format handlers), `src/cli.ts` (CLI behavior), `src/types.ts` (core interfaces), `src/__tests__/` (test conventions).

## Architecture & patterns (why it’s organized this way)
- Single orchestrator: `MarkdownConverter` is the central coordinator. It attempts conversions by iterating registered `DocumentConverter`s in priority order. New converters are registered via `registerPageConverter`.
- Converter contract: Extend `DocumentConverter` and implement `convert(localPath, options?)` which returns `DocumentConverterResult | null`. Return `null` when the converter can't handle the file.
- Priority behavior: `registerPageConverter` uses `unshift` so **later-registered converters are tried first** (highest priority).
- Conversion flow: For URLs, `convertUrl` uses `axios.get(..., { responseType: 'arraybuffer', headers: { 'User-Agent': ... } })`, writes a temporary file, and calls the converters with candidate `fileExtension` values (from options, content-type, filename, url path).
- Error model: Failure modes include `UnsupportedFormatException` (no converter accepted the input) and `FileConversionException` (converter threw). CLI maps these to exit codes.
- Normalization: When a converter returns text, the orchestrator normalizes trailing whitespace and collapses multiple blank lines.

## How to add a new converter (concrete steps)
1. Create `src/converters/my-converter.ts` exporting a class that extends `DocumentConverter`.
2. Implement `async convert(localPath: string, options: ConvertOptions = {})`.
   - Check `options.fileExtension` or `options.url` as needed and return `null` early if it doesn't apply.
   - On success return `{ title: string|null, textContent: string }`.
   - On parse failures, throw a descriptive `Error` (the orchestrator wraps/propagates as a `FileConversionException`).
3. Register the converter:
   - For a global converter, add `this.registerPageConverter(new MyConverter())` in `MarkdownConverter` constructor or register dynamically in tests.
   - Remember that later registrations are prioritized.
4. Add a unit test in `src/__tests__/` that writes a fixture file to a `test-files` folder and cleans it up in `afterAll`.
   - Use Jest and `fs/promises` like older tests.
   - If your converter requires URL context, inject `options.url` in tests or mock `convertResponse`/`axios` as shown in existing tests.
5. Export if necessary (update `src/markdown-converter.ts` re-exports) and update README docs.

## Testing & mocking tips
- Tests use Jest + ts-jest. See `package.json` scripts (`npm test`) and `src/__tests__/markdown-converter.test.ts` for examples.
- To mock HTTP calls, the project mocks `axios` via `jest.mock('axios')` and uses `jest.Mocked<typeof axios>`.
- Create small fixture files under `src/__tests__/test-files`, and ensure you remove them in `afterAll`.
- To assert converter priority, register two short mock converters and verify the most recently registered wins (see `registerPageConverter` tests).

## Common conventions & gotchas
- TypeScript strict mode is enabled—use declared interfaces (`ConvertOptions`, `DocumentConverterResult`) and keep types explicit.
- Converters should be conservative: prefer returning `null` when unsure rather than throwing; throw only on definitive parse errors or IO failures.
- HTML handling: `HtmlConverter` strips `<script>` and `<style>`, uses `cheerio` + `turndown`, and has custom turndown rules for links/images—follow that style if modifying formatting logic.
- YouTube/Wikipedia: These are specialized HTML converters that rely on `options.url` (e.g., `YouTubeConverter` checks `options.url.startsWith('https://www.youtube.com/watch?')`). Use `options.url` for context-sensitive parsing.
- PDFs: Use `pdf-parse` and expect `title` from `pdfData.info?.Title` when available.
- Axios requests from the code use a `User-Agent` string and `responseType: 'arraybuffer'`—preserve that for remote fetches.
- Temporary files: `convertResponse` writes to a temp directory via `mkdtemp`, then cleans up with `unlink`/`rmdir`. Keep cleanup robust (wrap cleanup in try/catch).

## Developer workflows
- Build: `npm run build` (TypeScript compilation)
- Dev watch: `npm run dev` (watch mode)
- Run CLI locally: `npm run cli` (or `node dist/cli.js <src>` after build; `npm run dev` + `npm run cli` helps during dev)
- Tests: `npm test` (use `npm test -- --watch` for watch mode)
- Formatting & linting: `npm run format` and `npm run lint` (pre-commit hooks are not present—run locally)

## Useful places to look / double-check
- `src/markdown-converter.ts` (conversion orchestration and extension detection)
- `src/converters/html-converter.ts` (turndown customization and sanitization rules)
- `src/converters/youtube-converter.ts` (example of a site-specific converter that inspects `options.url`)
- `src/__tests__/` (practical examples for mocking axios, file fixtures, and validator patterns)
- `README.md` (high-level features and CLI examples)

---
If anything here is unclear or you'd like more detail in any section (examples, tests, or a template converter), say which part you'd like expanded and I will iterate. :sparkles: