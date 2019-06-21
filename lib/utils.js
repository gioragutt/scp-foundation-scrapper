const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const moduleName = () => process.argv[1].split('/').slice(-1)[0];

const groupAndTime = async (label, action) => {
  console.group(label);
  console.time(label);
  const result = await action();
  console.groupEnd();
  console.timeEnd(label);
  return result;
};

module.exports = {
  delay,
  moduleName,
  groupAndTime,
};
