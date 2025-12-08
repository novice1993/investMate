import { initializeKisAccessToken, initializeKisApprovalKey, initializeLLM, initializeSupabase } from "@/core/services/initialization.service";
import { initializeLastRunTime } from "./core/services/news-execution-tracker.service";

export async function register() {
  // This check ensures this code runs only in the Node.js runtime, not on the Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Starting application initialization in Node.js runtime...");

    try {
      await initializeSupabase();
      await initializeLLM();
      await initializeKisAccessToken();
      await initializeKisApprovalKey();
      initializeLastRunTime(); // 뉴스 수집 마지막 실행 시간 초기화
      console.log("Application initialization finished successfully.");
    } catch (error) {
      console.error("Critical error during application initialization. Server might be in an unstable state.", error instanceof Error ? error.message : error);
      throw error;
    }

    // Initialize cron jobs (non-critical, server continues even if this fails)
    try {
      const { initializeCronJobs } = await import("./core/cron");
      initializeCronJobs();
    } catch (error) {
      console.error("⚠️ [CRITICAL] Cron initialization failed:", error instanceof Error ? error.message : error);
      console.error("Server will continue, but scheduled tasks won't run.");
    }
  }
}
