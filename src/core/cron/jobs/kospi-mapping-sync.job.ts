import { syncKospiCorpMapping } from "@/core/workflows/kospi-mapping";
import { shouldRunCronJob } from "../utils/enabled";
import { isMutexLocked, acquireMutex, releaseMutex } from "../utils/mutex";

const ENV_KEY = "ENABLE_KOSPI_MAPPING_SYNC_CRON";

export const kospiMappingSyncJob = {
  name: "kospi-mapping-sync",
  schedule: "*/10 * * * *", // 매시간 10분 단위 (00, 10, 20, 30, 40, 50분)

  handler: async () => {
    // 0. 환경 변수로 실행 여부 확인
    if (!shouldRunCronJob(kospiMappingSyncJob.name, ENV_KEY)) {
      return;
    }

    // 1. Mutex 상태 확인
    if (isMutexLocked(kospiMappingSyncJob.name)) {
      console.log(`[Cron ${kospiMappingSyncJob.name}] 이전 실행이 아직 진행 중, 스킵`);
      return;
    }

    // 2. Mutex 획득
    acquireMutex(kospiMappingSyncJob.name);

    const startTime = Date.now();

    try {
      const now = new Date();
      console.log(`[Cron ${kospiMappingSyncJob.name}] Starting at ${now.toISOString()}`);

      const result = await syncKospiCorpMapping();

      console.log(`[Cron ${kospiMappingSyncJob.name}] ✓ Completed in ${Date.now() - startTime}ms`, {
        success: result.success,
        count: result.count,
        message: result.message,
      });

      return result;
    } catch (error) {
      console.error(`[Cron ${kospiMappingSyncJob.name}] ✗ Failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : "Unknown error");
      throw error;
    } finally {
      // 3. Mutex 해제
      releaseMutex(kospiMappingSyncJob.name);
    }
  },
};
