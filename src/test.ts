import { extractRelatedScps } from './workers/extractRelatedScps/extractRelatedScps';
import axis from 'axios';

(async function main() {
  const url = 'http://www.scp-wiki.net/scp-006';
  const data = await axis(url).then(r => r.data);
  console.log(extractRelatedScps(data));
})().catch(console.error);
