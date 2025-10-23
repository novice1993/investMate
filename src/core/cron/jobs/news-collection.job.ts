import { runNewsCollectionWorkflow } from "@/core/workflows/news.workflow";

export const newsCollectionJob = {
  name: "news-collection",
  schedule: "*/10 * * * *", // 10분마다 실행
  enabled: true,

  handler: async () => {
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
    }
  },
};
