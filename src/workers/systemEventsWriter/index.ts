import { createChannel } from '../../lib/rabbit';
import { SYSTEM_EVENTS, SystemEvent } from '../../lib/systemEvents';
import { saveEventToDatabase } from './saveEventToDatabase';

const logEvent = ({ timestamp, type, ...rest }: SystemEvent) =>
  console.log(`${new Date(timestamp).toLocaleString()} [${type}]`, rest);

async function main() {
  try {
    const channel = await createChannel();
    await SYSTEM_EVENTS.consumptionInit(channel);
    await channel.consume(SYSTEM_EVENTS.queueName, async msg => {
      const event: SystemEvent = JSON.parse(msg.content.toString());
      logEvent(event);
      await saveEventToDatabase(event);
      channel.ack(msg);
    });
  } catch (e) {
    console.error('Caught error starting consumer');
    console.error(e);
    process.exit(-1);
  }
}

main();
