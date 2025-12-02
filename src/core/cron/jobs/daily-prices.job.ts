import { runDailyPricesWorkflow } from "@/core/workflows/daily-prices";
import { shouldRunCronJob } from "../utils/enabled";
import { isMutexLocked, acquireMutex, releaseMutex } from "../utils/mutex";

const ENV_KEY = "ENABLE_DAILY_PRICES_CRON";

export const dailyPricesJob = {
  name: "daily-prices",
  schedule: "30 16 * * 1-5", // 평일 오후 4시 30분 (장 마감 후)

  handler: async () => {
    // 0. 환경 변수로 실행 여부 확인
    if (!shouldRunCronJob(dailyPricesJob.name, ENV_KEY)) {
      return;
    }

    // 1. Mutex 상태 확인
    if (isMutexLocked(dailyPricesJob.name)) {
      console.log(`[Cron ${dailyPricesJob.name}] 이전 실행이 아직 진행 중, 스킵`);
      return;
    }

    // 2. Mutex 획득
    acquireMutex(dailyPricesJob.name);

    const startTime = Date.now();

    try {
      const now = new Date();
      console.log(`[Cron ${dailyPricesJob.name}] Starting at ${now.toISOString()}`);

      const result = await runDailyPricesWorkflow();

      console.log(`[Cron ${dailyPricesJob.name}] ✓ Completed in ${Date.now() - startTime}ms`, {
        total: result.totalStocks,
        processed: result.processedCount,
        failed: result.failedCount,
        successRate: result.totalStocks > 0 ? `${((result.processedCount / result.totalStocks) * 100).toFixed(1)}%` : "N/A",
      });

      return result;
    } catch (error) {
      console.error(`[Cron ${dailyPricesJob.name}] ✗ Failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : "Unknown error");
      throw error;
    } finally {
      // 3. Mutex 해제
      releaseMutex(dailyPricesJob.name);
    }
  },
};
