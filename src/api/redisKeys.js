const rawHtmlKey = id => `${id}-raw-html`;
const relatedScpsKey = id => `${id}-related-scps`;
const tagsKey = id => `${id}-tags`;
const tagsToScpsKey = tag => `${tag}-scps`;
const ALL_TAGS_KEY = 'all-scp-tags';

module.exports = {
  rawHtmlKey,
  relatedScpsKey,
  tagsKey,
  tagsToScpsKey,
  ALL_TAGS_KEY,
};
