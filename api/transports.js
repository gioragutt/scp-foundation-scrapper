const { createExchange, createQueue } = require('../lib/transports');

const BEGIN_PROCESSING_SCP = createQueue('begin_processing_scp');
const SCP_HTML_EXTRACTED = createExchange('scp_html_extracted', 'fanout');

module.exports = {
  BEGIN_PROCESSING_SCP,
  SCP_HTML_EXTRACTED,
};
