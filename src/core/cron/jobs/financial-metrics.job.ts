import { runFinancialMetricsWorkflow } from "@/core/workflows/financial";
import { shouldRunCronJob } from "../utils/enabled";
import { isMutexLocked, acquireMutex, releaseMutex } from "../utils/mutex";

const ENV_KEY = "ENABLE_FINANCIAL_METRICS_CRON";

export const financialMetricsJob = {
  name: "financial-metrics",
  schedule: "15 * * * *", // 매시간 15분에 실행

  handler: async () => {
    // 0. 환경 변수로 실행 여부 확인
    if (!shouldRunCronJob(financialMetricsJob.name, ENV_KEY)) {
      return;
    }

    // 1. Mutex 상태 확인
    if (isMutexLocked(financialMetricsJob.name)) {
      console.log(`[Cron ${financialMetricsJob.name}] 이전 실행이 아직 진행 중, 스킵`);
      return;
    }

    // 2. Mutex 획득
    acquireMutex(financialMetricsJob.name);

    const startTime = Date.now();

    try {
      const now = new Date();
      console.log(`[Cron ${financialMetricsJob.name}] Starting at ${now.toISOString()}`);

      // Workflow가 자동으로 최신 분기를 결정합니다 (Query Strategy Service)
      const result = await runFinancialMetricsWorkflow();

      console.log(`[Cron ${financialMetricsJob.name}] ✓ Completed in ${Date.now() - startTime}ms`, {
        total: result.totalCompanies,
        processed: result.processedCount,
        failed: result.failedCount,
        successRate: `${((result.processedCount / result.totalCompanies) * 100).toFixed(1)}%`,
      });

      return result;
    } catch (error) {
      console.error(`[Cron ${financialMetricsJob.name}] ✗ Failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : "Unknown error");
      throw error;
    } finally {
      // 3. Mutex 해제
      releaseMutex(financialMetricsJob.name);
    }
  },
};
