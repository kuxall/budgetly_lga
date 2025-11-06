"""Background scheduler service for automated tasks."""
import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Optional

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self):
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self.check_interval = 3600  # Check every hour (3600 seconds)
        self.daily_run_time = time(9, 0)  # Run daily tasks at 9:00 AM
        self.last_daily_run = None

    async def start(self):
        """Start the background scheduler."""
        if self.running:
            logger.warning("Scheduler is already running")
            return

        self.running = True
        self.task = asyncio.create_task(self._run_scheduler())
        logger.info("Background scheduler started")

    async def stop(self):
        """Stop the background scheduler."""
        if not self.running:
            return

        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Background scheduler stopped")

    async def _run_scheduler(self):
        """Main scheduler loop."""
        logger.info(f"Scheduler running with {self.check_interval}s interval")

        while self.running:
            try:
                current_time = datetime.now()
                current_date = current_time.date()

                # Check if we should run daily tasks
                should_run_daily = (
                    self.last_daily_run != current_date and
                    current_time.time() >= self.daily_run_time
                )

                if should_run_daily:
                    await self._run_daily_tasks()
                    self.last_daily_run = current_date

                # Sleep until next check
                await asyncio.sleep(self.check_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

    async def _run_daily_tasks(self):
        """Run daily scheduled tasks."""
        logger.info("Running daily scheduled tasks...")

        try:
            # Run budget monitoring checks
            await self._run_budget_checks()

            # Add other daily tasks here as needed:
            # - Data cleanup
            # - Report generation
            # - Backup tasks
            # - Analytics processing

        except Exception as e:
            logger.error(f"Error in daily tasks: {str(e)}")

    async def _run_budget_checks(self):
        """Run budget monitoring checks."""
        try:
            from .budget_monitoring_service import budget_monitoring_service

            logger.info("Running scheduled budget checks...")
            result = await budget_monitoring_service.process_all_budget_alerts()

            if result["total_alerts_sent"] > 0:
                logger.info(
                    f"Sent {result['total_alerts_sent']} budget alerts to {result['users_with_alerts']} users")
            else:
                logger.debug("No budget alerts needed")

        except Exception as e:
            logger.error(f"Error running budget checks: {str(e)}")

    async def run_budget_checks_now(self):
        """Run budget checks immediately (for manual triggering)."""
        logger.info("Running budget checks manually...")
        await self._run_budget_checks()

    async def run_daily_tasks_now(self):
        """Run all daily tasks immediately (for manual triggering)."""
        logger.info("Running daily tasks manually...")
        await self._run_daily_tasks()


# Create global instance
scheduler_service = SchedulerService()


# Utility functions for external use
async def start_scheduler():
    """Start the scheduler service."""
    await scheduler_service.start()


async def stop_scheduler():
    """Stop the scheduler service."""
    await scheduler_service.stop()


async def run_budget_check_now():
    """Run budget check immediately."""
    await scheduler_service.run_budget_checks_now()


async def run_daily_tasks_now():
    """Run daily tasks immediately."""
    await scheduler_service.run_daily_tasks_now()
