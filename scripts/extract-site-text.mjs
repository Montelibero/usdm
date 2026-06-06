import { readFile, writeFile } from 'node:fs/promises';

function decodeEntities(text) {
  return text
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&nbsp;', ' ');
}

function stripTags(text) {
  return text.replace(/<[^>]*>/g, ' ');
}

function normalizeHtmlToText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(
      /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
      (_match, attrs, label) => {
        const href = attrs.match(/\bhref=(["'])(.*?)\1/i)?.[2];
        const cleanLabel = decodeEntities(stripTags(label)).replace(/\s+/g, ' ').trim();
        return href ? `${cleanLabel} [${decodeEntities(href)}]` : cleanLabel;
      },
    )
    .replace(/<(h[1-6]|p|li|summary|td|th|div|section|article|header|footer|br)\b[^>]*>/gi, '\n')
    .replace(/<\/(h[1-6]|p|li|summary|td|th|div|section|article|header|footer|tr)>/gi, '\n');

  text = decodeEntities(stripTags(text));

  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .concat('\n');
}

async function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath) {
    throw new Error('Usage: node scripts/extract-site-text.mjs <input.html> [output.txt]');
  }

  const text = normalizeHtmlToText(await readFile(inputPath, 'utf8'));
  if (outputPath) {
    await writeFile(outputPath, text);
  } else {
    process.stdout.write(text);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { normalizeHtmlToText };
