"""MongoDB-only data persistence service."""
import os
import logging
import certifi
from pymongo import MongoClient
from services.mongo_data_service import MongoDataServiceSyncWrapper

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)

# Create global instance - Always use MongoDB
mongo_uri = os.getenv("MONGODB_URI")
mongo_db = os.getenv("MONGODB_DB", "budgetly")

if not mongo_uri:
    raise ValueError("MONGODB_URI environment variable is required")

# Quick ping with a short timeout; allow exceptions to propagate so startup fails when DB is unreachable
client = MongoClient(
    mongo_uri, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
client.admin.command('ping')

# Ping succeeded, use the Mongo wrapper
data_service = MongoDataServiceSyncWrapper(uri=mongo_uri, db_name=mongo_db)
logger.info("Using MongoDB-backed data service")
