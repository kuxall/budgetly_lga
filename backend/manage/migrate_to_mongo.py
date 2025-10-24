"""Migration script: import JSON files into MongoDB collections.

Usage:
    python manage/migrate_to_mongo.py --uri mongodb://localhost:27017 --db budgetly

This script will read data/*.json and insert into collections: users, expenses, budgets, income, reset_tokens.
It will not delete existing data by default; use --drop to drop target collections first.
"""
import os
import argparse
import json
from pprint import pprint
from pymongo import MongoClient


def load_json(path, default):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--uri', default=os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
    parser.add_argument('--db', default=os.getenv('MONGODB_DB', 'budgetly'))
    parser.add_argument('--data-dir', default=os.path.join(os.path.dirname(__file__), '..', 'data'))
    parser.add_argument('--drop', action='store_true', help='Drop existing target collections before import')
    parser.add_argument('--collections', nargs='+', default=None, help='List of collections to migrate (e.g. users expenses)')
    parser.add_argument('--filter-active', action='store_true', help='Only migrate users with is_active=true')
    parser.add_argument('--email-domain', default=None, help='Only migrate users with email ending in DOMAIN (e.g. example.com)')
    parser.add_argument('--dry-run', action='store_true', help='Show counts and skip insert operations')
    args = parser.parse_args()

    client = MongoClient(args.uri)
    db = client[args.db]

    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))

    mappings = [
        ('users.json', 'users', True),  # users is a map keyed by id
        ('expenses.json', 'expenses', False),
        ('budgets.json', 'budgets', False),
        ('income.json', 'income', False),
        ('reset_tokens.json', 'reset_tokens', True),
    ]

    for file_name, coll_name, is_map in mappings:
        path = os.path.join(data_dir, file_name)
        data = load_json(path, {} if is_map else [])
        coll = db[coll_name]
        if args.drop:
            print(f'Dropping collection {coll_name}')
            coll.drop()

        if is_map and isinstance(data, dict):
            docs = []
            for key, value in data.items():
                if coll_name == 'users':
                    value['id'] = key
                elif coll_name == 'reset_tokens':
                    # token stored as key
                    value['token'] = key

                # Apply user filters if requested
                if coll_name == 'users':
                    if args.filter_active and not value.get('is_active', True):
                        continue
                    if args.email_domain and not value.get('email', '').endswith(args.email_domain):
                        continue

                docs.append(value)
        else:
            docs = data

        if not docs:
            print(f'No data found for {file_name} (after filters), skipping')
            continue

        if args.collections and coll_name not in args.collections:
            print(f'Skipping {coll_name} (not in requested collections)')
            continue

        # Show counts and optionally insert
        print(f'Prepared to insert {len(docs)} documents into {coll_name}')
        if args.dry_run:
            print(f'DRY RUN: skipping insert into {coll_name}')
            continue

        # Insert documents
        print(f'Inserting {len(docs)} documents into {coll_name}')
        result = coll.insert_many(docs)
        print(f'Inserted {len(result.inserted_ids)} docs into {coll_name}')

    print('Migration complete')


if __name__ == '__main__':
    main()
