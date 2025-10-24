"""Create recommended MongoDB indexes for Budgetly collections.

This script is idempotent and safe to run multiple times. It will:
- create unique indexes for users.id and users.email
- create indexes on user_id for expenses, budgets, income
- ensure reset_tokens has a unique token index and a TTL index on expires_at
- convert reset_tokens.expires_at string values to BSON datetimes where possible

Usage:
  python3 manage/create_indexes.py --uri <MONGODB_URI> --db budgetly

If no --uri is provided, the script reads MONGODB_URI from the environment.
"""
import os
import argparse
from datetime import datetime
from pymongo import MongoClient, ASCENDING


def parse_iso(s):
    try:
        # support trailing Z
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--uri', default=os.getenv('MONGODB_URI'))
    parser.add_argument('--db', default=os.getenv('MONGODB_DB', 'budgetly'))
    args = parser.parse_args()

    if not args.uri:
        print('ERROR: Provide --uri or set MONGODB_URI in the environment')
        return

    client = MongoClient(args.uri)
    db = client[args.db]

    print('Creating/ensuring indexes...')

    # Users: unique id and unique email (email sparse in case some docs don't have it)
    db.users.create_index([('id', ASCENDING)], unique=True)
    db.users.create_index([('email', ASCENDING)], unique=True, sparse=True)
    print(' - users.id and users.email indexes created')

    # Expenses/Budgets/Income: index on user_id
    db.expenses.create_index([('user_id', ASCENDING)])
    db.budgets.create_index([('user_id', ASCENDING)])
    db.income.create_index([('user_id', ASCENDING)])
    print(' - user_id indexes for expenses, budgets, income created')

    # Reset tokens: ensure token uniqueness and convert expires_at to datetime for TTL
    db.reset_tokens.create_index([('token', ASCENDING)], unique=True)
    print(' - reset_tokens.token unique index created')

    # Convert expires_at strings to datetimes (if needed)
    updated = 0
    for doc in db.reset_tokens.find({}):
        expires = doc.get('expires_at')
        if expires and isinstance(expires, str):
            dt = parse_iso(expires)
            if dt:
                db.reset_tokens.update_one({'_id': doc['_id']}, {'$set': {'expires_at': dt}})
                updated += 1

    if updated:
        print(f' - converted {updated} reset_tokens.expires_at to datetime')
    else:
        print(' - no reset token expires_at conversions needed')

    # Create TTL index: expires_at field with expireAfterSeconds=0 (remove at expiry time)
    try:
        db.reset_tokens.create_index('expires_at', expireAfterSeconds=0)
        print(' - TTL index on reset_tokens.expires_at created')
    except Exception as e:
        print(' - failed to create TTL index (check field types):', e)

    print('Indexes created/ensured successfully')


if __name__ == '__main__':
    main()
