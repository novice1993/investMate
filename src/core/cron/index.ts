import { ScheduledTask } from "node-cron";
import { dailyPricesJob } from "./jobs/daily-prices.job";
import { financialMetricsJob } from "./jobs/financial-metrics.job";
import { kospiMappingSyncJob } from "./jobs/kospi-mapping-sync.job";
import { signalScreeningJob } from "./jobs/signal-screening.job";
import { stockValuationJob } from "./jobs/stock-valuation.job";
import { registerCronJob } from "./utils/register";

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

  // Job 등록
  registerCronJob(kospiMappingSyncJob, scheduledJobs);
  registerCronJob(financialMetricsJob, scheduledJobs);
  registerCronJob(stockValuationJob, scheduledJobs);
  registerCronJob(dailyPricesJob, scheduledJobs);
  registerCronJob(signalScreeningJob, scheduledJobs);

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
