import * as cheerio from 'cheerio';
import { ITEM_NUMBER_REGEX } from '../../api/constants';
import { removeDuplicates } from '../../lib/utils';

const readRelatedScps = (elements: Cheerio): string[] => {
  const relatedScps = elements.toArray()
    .map(e => cheerio.html(e))
    .map(e => e.match(ITEM_NUMBER_REGEX))
    .filter(e => e !== null);
  return Array.prototype.concat.apply([], relatedScps);
};

export function extractRelatedScps(scpHtml: string) {
  const $ = cheerio.load(scpHtml);
  const pageContent = $('#page-content > :not(.footer-wikiwalk-nav)');
  const relatedScps = readRelatedScps(pageContent);
  return removeDuplicates(relatedScps);
}
