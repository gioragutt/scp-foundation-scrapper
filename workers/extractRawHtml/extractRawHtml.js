const axios = require('axios');

const ITEM_NUMBER_REGEX = /SCP-[0-9]{3,4}/g;

module.exports = async url => {
  const { data: html } = await axios(url);
  const id = url.toUpperCase().match(ITEM_NUMBER_REGEX)[0];
  return { id, html };
};
