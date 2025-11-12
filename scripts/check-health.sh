#!/bin/bash

# Content Factory - Health Check Script
# Verifies all services are running correctly

echo "🏥 Content Factory - Health Check"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check API health
echo -n "Checking API Server... "
if curl -s http://localhost:3001/health | grep -q "OK"; then
    echo -e "${GREEN}✅ Healthy${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

# Check Frontend
echo -n "Checking Frontend... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Accessible${NC}"
else
    echo -e "${RED}❌ Not accessible${NC}"
fi

# Check MongoDB connection (via Docker)
echo -n "Checking MongoDB... "
if docker exec content-factory-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot connect (might be external)${NC}"
fi

# Check Redis
echo -n "Checking Redis... "
if docker exec content-factory-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Not responding${NC}"
fi

# Check Docker containers
echo ""
echo "Docker Container Status:"
docker-compose ps

echo ""
echo "Recent Logs (last 20 lines):"
echo "============================="
docker-compose logs --tail=20

echo ""
echo "Health check complete!"

