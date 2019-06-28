const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const moduleName = () => {
  const parts = process.argv[1].split('/');
  const actualModuleName = parts[parts.length - 1].replace('.js', '');
  if (actualModuleName !== 'index') {
    return actualModuleName;
  }
  const folderName = parts[parts.length - 2];
  return folderName;
};

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
