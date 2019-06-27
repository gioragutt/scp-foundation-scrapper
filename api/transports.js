const { queue, exchange } = require('../lib/transports');

const BEGIN_PROCESSING_SCP = queue('begin_processing_scp');
const SCP_HTML_EXTRACTED = exchange('scp_html_extracted', 'fanout');

module.exports = {
  BEGIN_PROCESSING_SCP,
  SCP_HTML_EXTRACTED,
};
