import { runNewsCollectionWorkflow } from "@/core/workflows/news";
import { isMutexLocked, acquireMutex, releaseMutex } from "../utils/mutex";

export const newsCollectionJob = {
  name: "news-collection",
  schedule: "*/10 * * * *", // 10분마다 실행
  enabled: true,

  handler: async () => {
    // 1. Mutex 상태 확인
    if (isMutexLocked(newsCollectionJob.name)) {
      console.log(`[Cron ${newsCollectionJob.name}] 이전 실행이 아직 진행 중, 스킵`);
      return;
    }

    // 2. Mutex 획득
    acquireMutex(newsCollectionJob.name);

    const startTime = Date.now();

    try {
      console.log(`[Cron ${newsCollectionJob.name}] Starting at ${new Date().toISOString()}`);

      const result = await runNewsCollectionWorkflow();

      console.log(`[Cron ${newsCollectionJob.name}] ✓ Completed in ${Date.now() - startTime}ms`, {
        collected: result.collectedCount,
        skipped: result.skippedCount,
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      console.error(`[Cron ${newsCollectionJob.name}] ✗ Failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : "Unknown error");
      throw error;
    } finally {
      // 3. Mutex 해제
      releaseMutex(newsCollectionJob.name);
    }
  },
};
