import pLimit from "p-limit";

const concurrency = Number(process.env.AGRI_API_CONCURRENCY) || 3;
export const agriApiLimiter = pLimit(concurrency);
