import { startJob } from './lib/jobs';
import { PROCESS_SCP } from './api/jobs';
import { delay } from './lib/utils';

async function main() {
  async function sendScpProcessRequest(scp: number) {
    await delay(1000);
    const url = `http://www.scp-wiki.net/scp-${scp.toString().padStart(3, '0')}`;
    console.log('Sending SCP processing request:', url);
    await startJob({ definition: PROCESS_SCP, args: url });
  }

  await Promise.all([3, 4, 5, 6, 7, 8].map(sendScpProcessRequest));
  await delay(1000);
  process.exit(0);
}

main().catch(console.error);
