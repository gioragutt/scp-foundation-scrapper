const cheerio = require('cheerio');
const axios = require('axios');

const ITEM_NUMBER_REGEX = /SCP-[0-9]{3,4}/g;
const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/i;
const NAVIGATION_CHARACTER = '«';

function initializeSectionData(title) {
  return {
    title,
    sectionParts: [],
  };
}

const handleTextNode = (section, child) => section.sectionParts.push(child.data);
const handleTagWithText = (section, child) => section.sectionParts.push(child.children[0].data);

const handleChildByType = {
  text: handleTextNode,
  a: handleTagWithText,
};

const handleUl = (section, children) => {
  const childData = children.filter(c => c.tagName === 'li').map(c => c.children[0].data);
  section.sectionParts.push(`[${childData.join(', ')}]`);
};

const recursivelyReadChildren = (output, children, filterChild) => {
  children.forEach(child => {
    if (filterChild(child)) {
      return;
    }

    const { type, data, children: innerChildren } = child;
    if (type === 'text') {
      output.push(data);
      return;
    }

    recursivelyReadChildren(output, innerChildren, filterChild);
  });
};

const handleBlockquote = (section, children) => {
  const childData = [];
  recursivelyReadChildren(childData, children, c => c.tagName === 'br');
  const fixedData = childData
    .map(s => s.trim())
    .map(d => {
      if (d.endsWith('.')) {
        return d;
      }
      return `${d}.`;
    })
    .map(s => s.trim())
    .join(' ');
  section.sectionParts.push(fixedData);
};

const nodeDescription = child => `${child.type}${child.tagName ? `(${child.tagName})` : ''}`;

function readSections(allParagraphs) {
  const titleToContent = {};
  let currentTitle;

  allParagraphs.each((index, { children, tagName, parent }) => {
    console.log('Handling', tagName);
    if (currentTitle && tagName === 'blockquote') {
      handleBlockquote(titleToContent[currentTitle], children);
      return;
    }

    if (currentTitle && tagName === 'ul') {
      handleUl(titleToContent[currentTitle], children);
      return;
    }

    if (tagName === 'p' && parent.tagName === 'blockquote') {
      return;
    }

    children.forEach(child => {
      if (child.type === 'tag' && child.tagName === 'strong') {
        currentTitle = child.children[0].data;
        titleToContent[currentTitle] = initializeSectionData(currentTitle);
        return;
      }

      if (!currentTitle) {
        console.log(`Cannot handle ${nodeDescription(child)} before title is found`);
        return;
      }

      const handleNode = handleChildByType[child.type] || handleChildByType[child.tagName];
      if (!handleNode) {
        console.log(`Unknown type ${nodeDescription(child)}`);
        return;
      }

      handleNode(titleToContent[currentTitle], child);
    });
  });

  return Object.values(titleToContent);
}

function filterNavigationParts(sectionParts) {
  const filtered = [];
  for (let i = 0; i < sectionParts.length; i++) {
    const sectionPart = sectionParts[i];
    if (sectionPart.includes(NAVIGATION_CHARACTER)) {
      console.log(`Part ${i}: '${sectionPart}' contains navigation character`);
      break;
    }
    filtered.push(sectionPart);
  }
  console.log(filtered);
  return filtered;
}

function cleanTitle(title) {
  const charactersToClean = [':', '#'];
  charactersToClean.forEach(char => {
    const lastIndexOfChar = title.lastIndexOf(char);
    if (lastIndexOfChar > 0) {
      title = title.substring(0, lastIndexOfChar);
    }
  });
  return title.trim();
}

function cleanColonFromBeginning(text) {
  text = text.trim();
  if (text && text[0] === ':') {
    text = text.substring(1);
  }
  return text.trim();
}

function processSectionParts(section) {
  const { sectionParts } = section;
  const title = cleanTitle(section.title);
  const content = filterNavigationParts(sectionParts)
    .map(cleanColonFromBeginning)
    .filter(s => s.length !== 0)
    .join(' ');

  if (!content) {
    console.log(`Section ${title} has no content?`);
  }

  const referencedScps = (content.match(ITEM_NUMBER_REGEX) || []).reduce((acc, curr) => {
    if (!acc.includes(curr)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  return {
    ...section,
    title,
    referencedScps,
    content,
  };
}

module.exports = async function processScp(url) {
  const { data: scpHtml } = await axios(url);
  const id = url.toUpperCase().match(ITEM_NUMBER_REGEX)[0];
  const $ = cheerio.load(scpHtml);
  const elementsToRead = ['p', 'ul', 'blockquote'];
  const paragraphsSelector = elementsToRead.map(e => `#page-content ${e}`).join(', ');
  const sections = readSections($(paragraphsSelector))
    .filter(section => section.sectionParts.length > 0)
    .map(processSectionParts);

  return {
    id,
    initialProcessingResult: sections,
    scpHtml,
  };
};
