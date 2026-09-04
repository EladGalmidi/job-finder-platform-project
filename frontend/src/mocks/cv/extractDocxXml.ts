import { createLogger } from '@/lib/logger';

const log = createLogger('cvDocxXml');

/**
 * Parts of a .docx that can hold body text. Headers and footers matter because
 * plenty of CV templates put the name, title and contact details there.
 */
const TEXT_PARTS = /^word\/(document|header\d*|footer\d*)\.xml$/;

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

/**
 * Pulls every run of text out of a .docx by reading its XML directly.
 *
 * This exists because mammoth walks Word's document model, and that model
 * leaves out content inside text boxes and some shapes. A great many CV
 * templates — particularly the designed ones — lay the whole page out in text
 * boxes and tables, so mammoth can return almost nothing for a document that is
 * visibly full of text.
 *
 * Reading `<w:t>` nodes straight from the XML is cruder: it has no notion of
 * headings, lists or emphasis, and the reading order of a multi-column layout
 * can come out jumbled. For skill detection none of that matters — the words are
 * all present, which is the whole requirement. It is a fallback, never the first
 * choice.
 */
export interface DocxXmlResult {
  readonly text: string;
  /** Entry names found in the archive, so a failure can describe the file. */
  readonly entries: string[];
}

export const extractDocxXml = async (file: File): Promise<DocxXmlResult> => {
  const { unzipSync } = await import('fflate');

  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const decoder = new TextDecoder();

  const parts = Object.keys(zip)
    .filter((name) => TEXT_PARTS.test(name))
    // document.xml first so the body leads, headers and footers after.
    .sort((left, right) => (left.includes('document') ? -1 : right.includes('document') ? 1 : 0));

  const entries = Object.keys(zip);

  if (parts.length === 0) {
    log.warn('no word document parts in archive', { entries: entries.slice(0, 12) });
    return { text: '', entries };
  }

  const chunks: string[] = [];

  for (const part of parts) {
    const bytes = zip[part];
    if (bytes === undefined) continue;

    const xml = decoder.decode(bytes);

    /*
     * Split on paragraphs first, then read the runs inside each.
     *
     * The order matters. Runs within a paragraph join with nothing, because Word
     * splits a single word across runs whenever formatting changes mid-word —
     * "Kuber" and "netes" have to come back as one token. Paragraphs join with a
     * newline, so words on separate lines never fuse into something that matches
     * no skill at all.
     */
    const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((match) => {
      const body = (match[1] ?? '').replace(/<\/w:tc>/g, ' ');

      return [...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((run) => decodeEntities(run[1] ?? ''))
        .join('');
    });

    const part_ = paragraphs.filter((line) => line.trim() !== '').join('\n');
    if (part_ !== '') chunks.push(part_);
  }

  const text = chunks.join('\n');
  log.debug('read docx xml', { parts: parts.length, characters: text.trim().length });

  return { text, entries };
};
