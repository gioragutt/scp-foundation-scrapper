export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const moduleName = (): string => {
  const parts = process.argv[1].split('/');
  const actualModuleName = parts[parts.length - 1].replace('.js', '');
  if (actualModuleName !== 'index') {
    return actualModuleName;
  }
  const folderName = parts[parts.length - 2];
  return folderName;
};

export async function groupAndTime<T>(label: string, action: () => Promise<T>): Promise<T> {
  console.group(label);
  console.time(label);
  const result = await action();
  console.groupEnd();
  console.timeEnd(label);
  return result;
}

export function removeDuplicates<T>(arr: T[]): T[] {
  return arr.reduce<T[]>((acc, curr) => {
    if (!acc.includes(curr)) {
      acc.push(curr);
    }
    return acc;
  }, []);
}