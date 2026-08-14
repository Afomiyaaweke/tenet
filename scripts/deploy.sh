#!/usr/bin/env bash
# ============================================================
# TenetBid Deployment Script
# This script pushes fixes to GitHub and deploys to Vercel
# ============================================================

set -euo pipefail

echo "========================================"
echo "  TenetBid Deployment Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
  echo "ERROR: Run this script from the project root directory"
  exit 1
fi

# Step 1: Push to GitHub
echo "Step 1: Pushing to GitHub..."
echo "--------------------------"

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Committing local changes..."
  git add -A
  git commit -m "fix: deployment improvements and registration fixes" || true
fi

# Push to GitHub
echo "Pushing to origin/main..."
git push origin main
echo "✓ Pushed to GitHub"
echo ""

# Step 2: Vercel auto-deploys from GitHub
echo "Step 2: Vercel Deployment"
echo "------------------------"
echo "Vercel will automatically deploy from GitHub."
echo "Check the deployment status at: https://vercel.com/dashboard"
echo ""

# Step 3: Verify environment variables
echo "Step 3: Verify Environment Variables"
echo "------------------------------------"
echo "Make sure these environment variables are set in Vercel:"
echo "  - JWT_SECRET (CRITICAL - generate with: openssl rand -base64 48)"
echo "  - DATABASE_URL or POSTGRES_PRISMA_URL (Neon PostgreSQL connection)"
echo "  - NEXT_PUBLIC_APP_URL=https://tenetbid.vercel.app"
echo ""
echo "Set them at: https://vercel.com/dashboard > Project > Settings > Environment Variables"
echo ""

echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
