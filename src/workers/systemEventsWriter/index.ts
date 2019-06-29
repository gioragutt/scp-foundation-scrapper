import { createChannel } from '../../lib/rabbit';
import { SYSTEM_EVENTS, SystemEvent } from '../../lib/systemEvents';

async function main() {
  try {
    const channel = await createChannel();
    await SYSTEM_EVENTS.consumptionInit(channel);
    await channel.consume(SYSTEM_EVENTS.queueName, msg => {
      const event: SystemEvent = JSON.parse(msg.content.toString());
      const { timestamp, type, ...rest } = event;
      console.log(`${new Date(timestamp).toLocaleString()} [${type}]`, rest);
      channel.ack(msg);
    });
  } catch (e) {
    console.error('Caught error starting consumer');
    console.error(e);
    process.exit(-1);
  }
}

main();