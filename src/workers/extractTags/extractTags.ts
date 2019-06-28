import * as cheerio from 'cheerio';

const readTags = (elements: Cheerio): string[] => {
  const tags: string[] = [];
  elements.each((_, e) => tags.push(e.children[0].data));
  return tags.filter(s => !s.startsWith('_'));
};

export function extractTags(html: string): string[] {
  const $ = cheerio.load(html);
  const tags = readTags($('#main-content .page-tags span a'));
  return tags;
}
