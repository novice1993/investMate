import { runStockValuationWorkflow } from "@/core/workflows/stock-valuation";
import { shouldRunCronJob } from "../utils/enabled";
import { isMutexLocked, acquireMutex, releaseMutex } from "../utils/mutex";

const ENV_KEY = "ENABLE_STOCK_VALUATION_CRON";

export const stockValuationJob = {
  name: "stock-valuation",
  schedule: "0 16 * * 1-5", // 평일 오후 4시 (장 마감 후)

  handler: async () => {
    // 0. 환경 변수로 실행 여부 확인
    if (!shouldRunCronJob(stockValuationJob.name, ENV_KEY)) {
      return;
    }

    // 1. Mutex 상태 확인
    if (isMutexLocked(stockValuationJob.name)) {
      console.log(`[Cron ${stockValuationJob.name}] 이전 실행이 아직 진행 중, 스킵`);
      return;
    }

    // 2. Mutex 획득
    acquireMutex(stockValuationJob.name);

    const startTime = Date.now();

    try {
      const now = new Date();
      console.log(`[Cron ${stockValuationJob.name}] Starting at ${now.toISOString()}`);

      const result = await runStockValuationWorkflow();

      console.log(`[Cron ${stockValuationJob.name}] ✓ Completed in ${Date.now() - startTime}ms`, {
        total: result.totalStocks,
        saved: result.savedCount,
        failed: result.failedCount,
      });

      return result;
    } catch (error) {
      console.error(`[Cron ${stockValuationJob.name}] ✗ Failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : "Unknown error");
      throw error;
    } finally {
      // 3. Mutex 해제
      releaseMutex(stockValuationJob.name);
    }
  },
};
