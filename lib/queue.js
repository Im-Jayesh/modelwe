import { Client } from "@upstash/qstash";

const qstash = new Client({ token: process.env.QSTASH_TOKEN });

/**
 * Global function to send ANY task to the background queue.
 * @param {string} jobName - The exact name of the job (e.g., "MODERATE_POST")
 * @param {object} payload - The data the job needs (e.g., { postId, imageUrl })
 * @param {string} delay - Optional delay (e.g., "1m", "5s", "2h")
 */
export async function enqueueJob(jobName, payload, delay = null) {
  // Automatically figure out if we are testing locally or live on Vercel
  const baseUrl = process.env.NODE_ENV === "development" 
    ? process.env.NGROK_URL // We will set this up next!
    : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

  const options = {
    url: `${baseUrl}/api/jobs`,
    body: { jobName, payload }, // We wrap your data in a standard format
  };

  if (delay) {
    options.delay = delay;
  }

  const result = await qstash.publishJSON(options);
  return result;
}