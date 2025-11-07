/**
 * @fileoverview Cron job 등록 유틸리티
 */

import cron, { ScheduledTask } from "node-cron";

/**
 * Cron Job 정의
 */
export interface CronJob {
  name: string;
  schedule: string;
  handler: () => Promise<unknown>;
}

/**
 * 단일 Cron Job을 등록합니다.
 *
 * @param job Cron Job 정의
 * @param scheduledJobs 등록된 Job을 추적하는 Map
 */
export function registerCronJob(job: CronJob, scheduledJobs: Map<string, ScheduledTask>): void {
  try {
    const task = cron.schedule(job.schedule, job.handler, {
      timezone: "Asia/Seoul",
    });

    scheduledJobs.set(job.name, task);
    console.log(`[Cron] ✓ ${job.name} scheduled: ${job.schedule}`);
  } catch (error) {
    console.error(`[Cron] ✗ Failed to schedule ${job.name}:`, error);
  }
}
