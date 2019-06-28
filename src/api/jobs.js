const { createJobDefinition } = require('../lib/jobs');
const { BEGIN_PROCESSING_SCP } = require('./transports');

const PROCESS_SCP = createJobDefinition('PROCESS_SCP', BEGIN_PROCESSING_SCP);

module.exports = {
  PROCESS_SCP,
};
