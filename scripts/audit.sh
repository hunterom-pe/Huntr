#!/bin/bash

# --- HUNTR PRE-PUSH AUDIT SCRIPT ---
# This script ensures the codebase is production-ready before pushing to GitHub.

set -e # Exit on any error

echo "🚀 Starting Pre-Push Audit..."

# 1. Database Sync
echo "📂 Checking Database Schema..."
npx prisma generate
npx prisma db push --accept-data-loss # Ensure schema is synced (use with caution in prod)

# 2. Linting
echo "🔍 Running Linter..."
npm run lint

# 3. Type Checking
echo "🏗️  Checking Types..."
npx tsc --noEmit

# 4. Building
echo "📦 Running Build..."
npm run build

# 5. E2E Testing (Playwright)
echo "🎭 Running Playwright Tests..."
# We run with CI=1 to ensure the webServer starts and stops correctly
CI=1 npm run test

echo "✅ Audit Complete! Codebase is ready for push."
