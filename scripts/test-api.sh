#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3000"
TEST_USER="testuser_$(date +%s)"

echo -e "${BLUE}"
echo "=========================================="
echo "  API Test Suite                         "
echo "=========================================="
echo -e "${NC}"

# Test 1: Health
echo -e "\n${BLUE}Test 1: Health Check${NC}"
echo -e "${BLUE}Request: GET /api/health${NC}"
RESPONSE=$(curl -s ${API_URL}/api/health)
echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Test 2: Enroll Admin
echo -e "\n${BLUE}Test 2: Enroll Admin${NC}"
echo -e "${BLUE}Request: POST /api/admin/enroll${NC}"
RESPONSE=$(curl -s -X POST ${API_URL}/api/admin/enroll)
echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Test 3: Register User
echo -e "\n${BLUE}Test 3: Register User (${TEST_USER})${NC}"
echo -e "${BLUE}Request: POST /api/users/register${NC}"
echo -e "${BLUE}Payload: {\"userId\": \"${TEST_USER}\"}${NC}"
RESPONSE=$(curl -s -X POST ${API_URL}/api/users/register \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${TEST_USER}\"}")
echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Test 4: Login
echo -e "\n${BLUE}Test 4: Login${NC}"
echo -e "${BLUE}Request: POST /api/users/login${NC}"
echo -e "${BLUE}Payload: {\"userId\": \"${TEST_USER}\"}${NC}"
RESPONSE=$(curl -s -X POST ${API_URL}/api/users/login \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${TEST_USER}\"}")
echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Test 5: List All Users
echo -e "\n${BLUE}Test 5: List All Users${NC}"
echo -e "${BLUE}Request: GET /api/users${NC}"
RESPONSE=$(curl -s ${API_URL}/api/users)
echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo -e "\n${GREEN}Tests Complete!${NC}\n"
