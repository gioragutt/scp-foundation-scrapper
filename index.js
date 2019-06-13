const cheerio = require('cheerio');
const axios = require('axios');

const url = process.argv[2] || 'http://www.scp-wiki.net/scp-003';

function addTextForTitle(titleToContent, currentTitle, data) {
  titleToContent[currentTitle] = titleToContent[currentTitle] || [];
  const content = titleToContent[currentTitle];
  content.push(data);
}

function processParagraphs(allParagraphs) {
  const titleToContent = {};
  let currentTitle;
  allParagraphs.each((index, element) => {
    element.children.forEach(child => {
      if (child.type === 'tag' && child.tagName === 'strong') {
        currentTitle = child.children[0].data;
        return;
      }

      if (child.type === 'text') {
        addTextForTitle(titleToContent, currentTitle, child.data);
      }
    });
  });

  return titleToContent;
}

async function main() {
  const { data } = await axios(url);
  const $ = cheerio.load(data);
  const paragraphs = $('#page-content > p');
  const titleToContent = processParagraphs(paragraphs);
  console.log(Object.keys(titleToContent));
}

main().catch(e => console.error(e.toJSON()));
