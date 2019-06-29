import { WorkerStatus } from './jobTracking';
import { queue } from './transports';
import { createConfirmChannel, sendToTransport } from './rabbit';

export const SYSTEM_EVENTS = queue('SYSTEM_EVENTS');

export enum SystemEventType {
  WorkerStatusUpdate = 'WorkerStatusUpdate',
  WorkerStarted = 'WorkerStarted',
  JobStarted = 'JobStarted'
}

abstract class BaseSystemEvent {
  readonly timestamp: number = Date.now();
}

export class WorkerStatusUpdate extends BaseSystemEvent {
  readonly type = SystemEventType.WorkerStatusUpdate;

  constructor(public jobId: string, public workerName: string, public status: WorkerStatus) {
    super();
  }
}

export class WorkerStarted extends BaseSystemEvent {
  readonly type = SystemEventType.WorkerStarted;

  constructor(public jobType: string, public workerName: string) {
    super();
  }
}

export class JobStarted extends BaseSystemEvent {
  readonly type = SystemEventType.JobStarted;

  constructor(public jobId: string, public jobType: string, public workers: string[]) {
    super();
  }
}

export type SystemEvent =
  | WorkerStatusUpdate
  | WorkerStarted
  | JobStarted;

export const sendSystemEvent = async (event: SystemEvent) => {
  const channel = await createConfirmChannel();
  await SYSTEM_EVENTS.init(channel);
  sendToTransport(channel, SYSTEM_EVENTS, event);
  await channel.waitForConfirms();
};
