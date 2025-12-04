import { runSignalScreeningWorkflow } from "@/core/workflows/signal-screening";
import { shouldRunCronJob } from "../utils/enabled";
import { isMutexLocked, acquireMutex, releaseMutex } from "../utils/mutex";

const ENV_KEY = "ENABLE_SIGNAL_SCREENING_CRON";

export const signalScreeningJob = {
  name: "signal-screening",
  schedule: "0 17 * * 1-5", // 평일 오후 5시 (daily-prices 이후)

  handler: async () => {
    // 0. 환경 변수로 실행 여부 확인
    if (!shouldRunCronJob(signalScreeningJob.name, ENV_KEY)) {
      return;
    }

    // 1. Mutex 상태 확인
    if (isMutexLocked(signalScreeningJob.name)) {
      console.log(`[Cron ${signalScreeningJob.name}] 이전 실행이 아직 진행 중, 스킵`);
      return;
    }

    // 2. Mutex 획득
    acquireMutex(signalScreeningJob.name);

    const startTime = Date.now();

    try {
      const now = new Date();
      console.log(`[Cron ${signalScreeningJob.name}] Starting at ${now.toISOString()}`);

      const result = await runSignalScreeningWorkflow();

      console.log(`[Cron ${signalScreeningJob.name}] ✓ Completed in ${Date.now() - startTime}ms`, {
        total: result.totalStocks,
        screened: result.screenedCount,
      });

      return result;
    } catch (error) {
      console.error(`[Cron ${signalScreeningJob.name}] ✗ Failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : "Unknown error");
      throw error;
    } finally {
      // 3. Mutex 해제
      releaseMutex(signalScreeningJob.name);
    }
  },
};
