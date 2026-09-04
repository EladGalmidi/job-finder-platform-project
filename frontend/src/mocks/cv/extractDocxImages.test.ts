import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { extractDocxImages } from './extractDocxImages';

const encoder = new TextEncoder();

/**
 * A stub picture whose length identifies it. jsdom's Blob cannot be read back,
 * so size is the only property available to tell one payload from another.
 */
const png = (marker: number): Uint8Array =>
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, ...Array<number>(marker).fill(0)]);

const sizes = (blobs: Blob[]): number[] => blobs.map((blob) => blob.size - 4);

interface Part {
  readonly id: string;
  readonly target: string;
}

const buildDocx = (parts: Part[], order: string[], media: Record<string, Uint8Array>): File => {
  const rels = `<?xml version="1.0"?><Relationships>${parts
    .map(
      (part) =>
        `<Relationship Id="${part.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${part.target}"/>`,
    )
    .join('')}</Relationships>`;

  const body = order.map((id) => `<w:r><w:drawing><a:blip r:embed="${id}"/></w:drawing></w:r>`).join('');

  const files: Record<string, Uint8Array> = {
    'word/document.xml': encoder.encode(`<?xml version="1.0"?><w:document><w:body>${body}</w:body></w:document>`),
    'word/_rels/document.xml.rels': encoder.encode(rels),
  };

  for (const [name, bytes] of Object.entries(media)) files[`word/${name}`] = bytes;

  return asFile(zipSync(files));
};

/**
 * jsdom's File has no arrayBuffer(), which is the only thing the reader needs
 * from it, so the test supplies a stand-in rather than a polyfill.
 */
const asFile = (bytes: Uint8Array): File =>
  ({
    name: 'cv.docx',
    arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
  }) as unknown as File;

describe('extractDocxImages', () => {
  it('returns pictures in document order, not archive order', async () => {
    const file = buildDocx(
      [
        { id: 'rId1', target: 'media/image1.png' },
        { id: 'rId2', target: 'media/image2.png' },
        { id: 'rId3', target: 'media/image3.png' },
      ],
      // The document references them back to front; the media folder does not
      // record reading order, so only these references can supply it.
      ['rId3', 'rId1', 'rId2'],
      {
        'media/image1.png': png(1),
        'media/image2.png': png(2),
        'media/image3.png': png(3),
      },
    );

    expect(sizes(await extractDocxImages(file))).toEqual([3, 1, 2]);
  });

  it('skips references a browser cannot decode', async () => {
    const file = buildDocx(
      [
        { id: 'rId1', target: 'media/diagram.emf' },
        { id: 'rId2', target: 'media/image2.png' },
      ],
      ['rId1', 'rId2'],
      { 'media/diagram.emf': png(9), 'media/image2.png': png(2) },
    );

    expect(sizes(await extractDocxImages(file))).toEqual([2]);
  });

  it('returns nothing when the archive is not a Word document', async () => {
    const file = asFile(zipSync({ 'content.xml': encoder.encode('<x/>') }));

    expect(await extractDocxImages(file)).toEqual([]);
  });
});
