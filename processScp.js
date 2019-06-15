const cheerio = require('cheerio');
const axios = require('axios');

const ITEM_NUMBER_REGEX = /SCP-[0-9]{3,4}/g;

function initializeSectionData(title) {
  return {
    title,
    sectionParts: [],
  };
}

function readSections(allParagraphs) {
  const titleToContent = {};
  let currentTitle;

  allParagraphs.each((index, element) => {
    element.children.forEach(child => {
      if (child.type === 'tag' && child.tagName === 'strong') {
        currentTitle = child.children[0].data;
        titleToContent[currentTitle] = initializeSectionData(currentTitle);
        return;
      }

      if (currentTitle && child.type === 'text') {
        titleToContent[currentTitle].sectionParts.push(child.data);
      }
    });
  });

  return Object.values(titleToContent);
}

function processSectionParts(section) {
  const { sectionParts } = section;
  const content = sectionParts.map(s => s.trim()).join(' ');
  const referencedScps = (ITEM_NUMBER_REGEX.exec(content) || []).reduce((acc, curr) => {
    acc.includes(curr) || acc.push(curr);
    return acc;
  }, []);
  return {
    ...section,
    referencedScps,
    content,
  };
}

module.exports = async function processScp(url) {
  const { data: scpHtml } = await axios(url);
  const $ = cheerio.load(scpHtml);
  const paragraphs = $('#page-content > p');
  return readSections(paragraphs)
    .filter(section => section.sectionParts.length > 0)
    .map(processSectionParts);
};
