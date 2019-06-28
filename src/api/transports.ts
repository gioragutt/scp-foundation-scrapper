import { queue, exchange } from '../lib/transports';

export const BEGIN_PROCESSING_SCP = queue('begin_processing_scp');
export const SCP_HTML_EXTRACTED = exchange('scp_html_extracted', 'fanout');