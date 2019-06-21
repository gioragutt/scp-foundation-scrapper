const rawHtmlKey = id => `${id}-raw-html`;
const initialProcessingResultKey = id => `${id}-initial-processing`;
const tagsKey = id => `${id}-tags`;
const tagsToScpsKey = tag => `${tag}-scps`;
const ALL_TAGS_KEY = 'all-scp-tags';

module.exports = {
  rawHtmlKey,
  initialProcessingResultKey,
  tagsKey,
  tagsToScpsKey,
  ALL_TAGS_KEY,
};
