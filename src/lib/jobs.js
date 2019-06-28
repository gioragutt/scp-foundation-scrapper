const { createChannel, sendToTransport } = require('./rabbit');
const { JOB_ID, registerJob } = require('./jobTracking');
const uuid = require('uuid');

const createJobDefinition = (jobType, transport, requiredArgs = []) => ({
  jobType,
  transport,
  requiredArgs,
});

const validateJobArguments = (requiredArgs, args) => {
  if (!requiredArgs || requiredArgs.length === 0) {
    return;
  }

  if (typeof args !== 'object') {
    return;
  }

  requiredArgs.forEach(arg => {
    if (!(arg in args)) {
      throw new Error(`Missing required argument ${arg} in ${args}`);
    }
  });
};

const startJob = async ({
  channel,
  definition: { jobType, transport, requiredArgs },
  args = {},
  headers = {},
}) => {
  validateJobArguments(requiredArgs, args);

  if (!channel) {
    channel = await createChannel();
  }

  const jobId = uuid();
  await transport.init(channel);
  await registerJob(jobType, jobId);

  console.log(`Starting ${jobType} job ${jobId}`);
  console.log('Parameters:', args);
  console.log('Headers:', headers);

  sendToTransport(channel, transport, args, {
    headers: {
      ...headers,
      [JOB_ID]: jobId,
    },
  });
};

module.exports = {
  createJobDefinition,
  startJob,
};
