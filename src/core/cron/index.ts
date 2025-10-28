import cron, { ScheduledTask } from "node-cron";
import { newsCollectionJob } from "./jobs/news-collection.job";

const scheduledJobs: Map<string, ScheduledTask> = new Map();

/**
 * 모든 cron job 초기화
 */
export function initializeCronJobs() {
  // 중복 실행 방지
  if (scheduledJobs.size > 0) {
    console.log("[Cron] Jobs already initialized");
    return;
  }

  console.log("[Cron] Initializing cron jobs...");

  try {
    // 뉴스 수집 job 등록
    const task = cron.schedule(newsCollectionJob.schedule, newsCollectionJob.handler, {
      timezone: "Asia/Seoul",
    });

    scheduledJobs.set(newsCollectionJob.name, task);
    console.log(`[Cron] ✓ ${newsCollectionJob.name} scheduled: ${newsCollectionJob.schedule}`);
  } catch (error) {
    console.error(`[Cron] ✗ Failed to schedule ${newsCollectionJob.name}:`, error);
  }

  console.log("[Cron] All jobs initialized successfully");
}

/**
 * 모든 cron job 중지
 */
export function stopCronJobs() {
  console.log("[Cron] Stopping all jobs...");

  scheduledJobs.forEach((task, name) => {
    task.stop();
    console.log(`[Cron] ✓ ${name} stopped`);
  });

  scheduledJobs.clear();
  console.log("[Cron] All jobs stopped");
}
