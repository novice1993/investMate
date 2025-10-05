import { initializeKisToken, initializeGemini, cleanupApplication } from "@/core/services/initialization.service";

export async function register() {
  console.log("Starting application initialization...");

  try {
    await initializeKisToken();
    await initializeGemini();
    console.log("Application initialization finished successfully.");
  } catch (error) {
    console.error("Critical error during application initialization. Server might be in an unstable state.");
    process.exit(1);
  }

  // Register graceful shutdown cleanup
  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM signal. Cleaning up...");
    await cleanupApplication();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("Received SIGINT signal. Cleaning up...");
    await cleanupApplication();
    process.exit(0);
  });
}
