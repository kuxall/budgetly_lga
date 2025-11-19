"""Production startup script for Budgetly."""
import os
import uvicorn
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


def main():
    """Start the production server."""
    logger.info("🚀 Starting Budgetly...")

    # Production configuration
    config = {
        "app": "main:app",
        "host": os.getenv("HOST", "127.0.0.1"),
        "port": int(os.getenv("PORT", "8000")),
        "reload": os.getenv("DEBUG", "False").lower() == "true",
        "log_level": os.getenv("LOG_LEVEL", "info").lower(),
        "access_log": True,
    }

    logger.info(
        f"🌐 Server will start on http://{config['host']}:{config['port']}")
    logger.info(f"🔧 Debug mode: {config['reload']}")
    logger.info(f"📝 Log level: {config['log_level']}")

    uvicorn.run(**config)


if __name__ == "__main__":
    main()
