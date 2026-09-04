import { unzipSync } from 'fflate';

/** Parts of a .docx that can hold body text. */
const TEXT_PARTS = /^word\/(document|header\d*|footer\d*)\.xml$/;

/** Picture formats Word embeds. Counted so a text-free file can say so. */
const IMAGE_PART = /^word\/media\/.+\.(png|jpe?g|gif|bmp|webp)$/i;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&(amp|lt|gt|quot|apos);/g, (match) => ENTITIES[match] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));

export interface DocxXmlResult {
  readonly text: string;
  /** Entry names in the archive, so a failure can describe the file. */
  readonly entries: string[];
  /** How many pictures it holds. A text-free CV usually stores text as these. */
  readonly images: number;
}

/**
 * Reads a .docx by parsing its XML directly.
 *
 * This exists because mammoth walks Word's document model, and that model
 * leaves out content inside text boxes and shapes. Many designed CV templates
 * lay the whole page out that way, so mammoth can return almost nothing for a
 * document that is visibly full of text.
 *
 * Reading `<w:t>` nodes straight from the XML is cruder — no headings, no
 * lists, and multi-column reading order can come out jumbled. For skill
 * detection none of that matters: the words are all present, which is the
 * requirement. It is a fallback, never the first choice.
 */
export const extractDocxXml = (bytes: Buffer): DocxXmlResult => {
  const zip = unzipSync(new Uint8Array(bytes));
  const decoder = new TextDecoder();

  const entries = Object.keys(zip);
  const images = entries.filter((name) => IMAGE_PART.test(name)).length;

  const parts = entries
    .filter((name) => TEXT_PARTS.test(name))
    // document.xml first so the body leads, headers and footers after.
    .sort((left, right) => (left.includes('document') ? -1 : right.includes('document') ? 1 : 0));

  if (parts.length === 0) return { text: '', entries, images };

  const chunks: string[] = [];

  for (const part of parts) {
    const partBytes = zip[part];
    if (partBytes === undefined) continue;

    const xml = decoder.decode(partBytes);

    /*
     * Paragraphs first, then the runs inside each. The order matters: runs
     * within a paragraph join with nothing, because Word splits a single word
     * across runs whenever formatting changes mid-word — "Kuber" and "netes"
     * have to come back as one token. Paragraphs join with a newline, so words
     * on separate lines never fuse into something matching no skill at all.
     */
    const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((match) => {
      const body = (match[1] ?? '').replace(/<\/w:tc>/g, ' ');

      return [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((run) => decodeEntities(run[1] ?? ''))
        .join('');
    });

    const joined = paragraphs.filter((line) => line.trim() !== '').join('\n');
    if (joined !== '') chunks.push(joined);
  }

  return { text: chunks.join('\n'), entries, images };
};
