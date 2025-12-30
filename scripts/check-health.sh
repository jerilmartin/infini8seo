#!/bin/bash

# Content Factory - Health Check Script
# Verifies all services are running correctly

echo "Content Factory - Health Check"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check API health
echo -n "Checking API Server... "
if curl -s http://localhost:3001/health | grep -q "OK"; then
    echo -e "${GREEN}[OK] Healthy${NC}"
else
    echo -e "${RED}[FAIL] Not responding${NC}"
fi

# Check Frontend
echo -n "Checking Frontend... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Accessible${NC}"
else
    echo -e "${RED}[FAIL] Not accessible${NC}"
fi

# Check Redis
echo -n "Checking Redis... "
if docker exec content-factory-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}[OK] Connected${NC}"
else
    echo -e "${RED}[FAIL] Not responding${NC}"
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
echo "Health check complete."
