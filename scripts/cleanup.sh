#!/bin/bash

# Content Factory - Cleanup Script
# Removes old jobs and content from the database

echo "Content Factory - Database Cleanup"
echo "======================================"
echo ""

read -p "This will delete jobs older than 30 days. Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo "Note: This script is designed for MongoDB cleanup."
echo "For Supabase (PostgreSQL), use the Supabase dashboard or run SQL directly."
echo ""
echo "Example SQL to delete old jobs:"
echo "  DELETE FROM contents WHERE job_id IN (SELECT id FROM jobs WHERE created_at < NOW() - INTERVAL '30 days');"
echo "  DELETE FROM jobs WHERE created_at < NOW() - INTERVAL '30 days';"
echo ""
