import { initializeKisToken, initializeGemini, cleanupApplication } from "@/core/services/initialization.service";

export async function register() {
  // This check ensures this code runs only in the Node.js runtime, not on the Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Starting application initialization in Node.js runtime...");

    try {
      await initializeKisToken();
      await initializeGemini();
      console.log("Application initialization finished successfully.");
    } catch (error) {
      console.error("Critical error during application initialization. Server might be in an unstable state.");
      process.exit(1);
    }

    // Register graceful shutdown hooks
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
}
