import { createJobDefinition } from '../lib/jobs';
import { BEGIN_PROCESSING_SCP } from './transports';

export const PROCESS_SCP = createJobDefinition('PROCESS_SCP', BEGIN_PROCESSING_SCP);
