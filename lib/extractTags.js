const cheerio = require('cheerio');

const readTags = elements => {
  const tags = [];
  elements.each((index, e) => tags.push(e.children[0].data));
  return tags.filter(s => !s.startsWith('_'));
};

module.exports = function extractTags(html) {
  const $ = cheerio.load(html);
  const tags = readTags($('#main-content .page-tags span a'));
  return tags;
};
