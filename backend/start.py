"""Production startup script for Budgetly."""
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def main():
    """Start the production server."""
    # Validate required environment variables

    print("🚀 Starting Budgetly...")

    # Production configuration
    config = {
        "app": "main:app",
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": int(os.getenv("PORT", "8000")),
        "reload": os.getenv("DEBUG", "False").lower() == "true",
        "log_level": os.getenv("LOG_LEVEL", "info").lower(),
        "access_log": True,
    }

    print(f"🌐 Server will start on http://{config['host']}:{config['port']}")
    print(f"🔧 Debug mode: {config['reload']}")
    print(f"📝 Log level: {config['log_level']}")

    uvicorn.run(**config)


if __name__ == "__main__":
    main()
