export const rawHtmlKey = (id: string) => `${id}-raw-html`;
export const relatedScpsKey = (id: string) => `${id}-related-scps`;
export const tagsKey = (id: string) => `${id}-tags`;
export const tagsToScpsKey = (tag: string) => `${tag}-scps`;
export const ALL_TAGS_KEY = 'all-scp-tags';

export const jobKey = (jobId: string) => `${jobId}-job`;
export const workersForJobTypeKey = (type: string) => `${type}-job-workers`;
export const jobWorkersStatusKey = (jobId: string) => `${jobId}-job-workers-status`;