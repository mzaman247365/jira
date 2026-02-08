#!/bin/bash
# Comprehensive API Test Suite for ProjectFlow
# Tests all endpoints with happy paths and edge cases

BASE="http://localhost:3000"
COOKIE_JAR="/tmp/projectflow-test-cookies.txt"
PASS=0
FAIL=0
ERRORS=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper functions
assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"

  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name (HTTP $actual)"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $test_name (expected $expected, got $actual)"
    [ -n "$body" ] && echo -e "    ${RED}Body: ${body:0:200}${NC}"
    ((FAIL++))
    ERRORS+=("$test_name: expected $expected, got $actual")
  fi
}

assert_json_field() {
  local test_name="$1"
  local json="$2"
  local field="$3"
  local expected="$4"

  local actual
  actual=$(echo "$json" | jq -r "$field" 2>/dev/null)

  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name ($field = $expected)"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $test_name ($field: expected '$expected', got '$actual')"
    ((FAIL++))
    ERRORS+=("$test_name: $field expected '$expected', got '$actual'")
  fi
}

assert_json_not_empty() {
  local test_name="$1"
  local json="$2"
  local field="$3"

  local actual
  actual=$(echo "$json" | jq -r "$field" 2>/dev/null)

  if [ -n "$actual" ] && [ "$actual" != "null" ] && [ "$actual" != "" ]; then
    echo -e "  ${GREEN}✓${NC} $test_name ($field is not empty)"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $test_name ($field is empty or null)"
    ((FAIL++))
    ERRORS+=("$test_name: $field is empty or null")
  fi
}

assert_json_array_length_gt() {
  local test_name="$1"
  local json="$2"
  local min="$3"

  local actual
  actual=$(echo "$json" | jq 'length' 2>/dev/null)

  if [ "$actual" -gt "$min" ] 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $test_name (array length $actual > $min)"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $test_name (array length $actual, expected > $min)"
    ((FAIL++))
    ERRORS+=("$test_name: array length $actual, expected > $min")
  fi
}

# Make an authenticated request (local-dev mode auto-authenticates)
api() {
  local method="$1"
  local path="$2"
  local data="$3"

  local args=(-s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR")

  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  curl "${args[@]}" -X "$method" "${BASE}${path}"
}

# Parse response: body and status code
parse_response() {
  local response="$1"
  BODY=$(echo "$response" | sed '$d')
  STATUS=$(echo "$response" | tail -1)
}

echo "================================================================"
echo "  ProjectFlow API Test Suite"
echo "  Base URL: $BASE"
echo "================================================================"
echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1] AUTH ENDPOINTS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get current user (auto-auth)
parse_response "$(api GET /api/auth/user)"
assert_status "GET /api/auth/user" "200" "$STATUS" "$BODY"
assert_json_field "Auth user has id" "$BODY" ".id" "local-dev-user"
assert_json_field "Auth user has email" "$BODY" ".email" "dev@localhost"
AUTH_USER_ID=$(echo "$BODY" | jq -r '.id')

# Test register with missing fields
parse_response "$(api POST /api/auth/register '{"email":"","password":""}')"
assert_status "Register with empty fields → 400" "400" "$STATUS" "$BODY"

# Test register with valid data
parse_response "$(api POST /api/auth/register '{"email":"test@test.com","password":"test123","firstName":"Test","lastName":"User"}')"
if [ "$STATUS" = "201" ] || [ "$STATUS" = "409" ]; then
  echo -e "  ${GREEN}✓${NC} Register endpoint responds ($STATUS)"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Register endpoint failed ($STATUS)"
  ((FAIL++))
  ERRORS+=("Register: expected 201 or 409, got $STATUS")
fi

# Test login with bad credentials
parse_response "$(api POST /api/auth/login '{"email":"nonexistent@test.com","password":"wrong"}')"
assert_status "Login with bad creds → 401" "401" "$STATUS" "$BODY"

# Test profile update
parse_response "$(api PATCH /api/auth/profile '{"firstName":"Updated","lastName":"Name"}')"
assert_status "PATCH /api/auth/profile → 200" "200" "$STATUS" "$BODY"

# Test password change with wrong old password
parse_response "$(api PATCH /api/auth/password '{"oldPassword":"wrong","newPassword":"new123"}')"
# This may be 401 (wrong password) or 500 (no password set for auto-user)
if [ "$STATUS" = "401" ] || [ "$STATUS" = "500" ]; then
  echo -e "  ${GREEN}✓${NC} Password change rejects wrong old password ($STATUS)"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Password change should reject wrong old password (got $STATUS)"
  ((FAIL++))
  ERRORS+=("Password change: expected 401 or 500, got $STATUS")
fi

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2] PROJECTS${NC}"
# ──────────────────────────────────────────────────────────────────────

# List projects
parse_response "$(api GET /api/projects)"
assert_status "GET /api/projects" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Projects list is not empty" "$BODY" "0"
PROJECT_ID=$(echo "$BODY" | jq -r '.[0].id')
PROJECT_KEY=$(echo "$BODY" | jq -r '.[0].key')

# Get single project
parse_response "$(api GET /api/projects/$PROJECT_ID)"
assert_status "GET /api/projects/:id" "200" "$STATUS" "$BODY"
assert_json_field "Project has correct id" "$BODY" ".id" "$PROJECT_ID"

# Get nonexistent project
parse_response "$(api GET /api/projects/nonexistent-id)"
assert_status "GET nonexistent project → 404" "404" "$STATUS" "$BODY"

# Create project
parse_response "$(api POST /api/projects '{"name":"Test Project","key":"TST","description":"A test project"}')"
assert_status "POST /api/projects → 201" "201" "$STATUS" "$BODY"
TEST_PROJECT_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Created project has name" "$BODY" ".name" "Test Project"
assert_json_field "Created project has key" "$BODY" ".key" "TST"

# Create project with duplicate key
parse_response "$(api POST /api/projects '{"name":"Dupe","key":"TST","description":"dupe"}')"
assert_status "Create project with dupe key → 400" "400" "$STATUS" "$BODY"

# Create project with missing required fields
parse_response "$(api POST /api/projects '{"description":"no name or key"}')"
assert_status "Create project missing fields → 400" "400" "$STATUS" "$BODY"

# Update project
parse_response "$(api PATCH /api/projects/$TEST_PROJECT_ID '{"name":"Updated Test Project","avatarColor":"#FF5630"}')"
assert_status "PATCH /api/projects/:id" "200" "$STATUS" "$BODY"
assert_json_field "Updated project name" "$BODY" ".name" "Updated Test Project"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3] ISSUES${NC}"
# ──────────────────────────────────────────────────────────────────────

# List project issues
parse_response "$(api GET /api/projects/$PROJECT_ID/issues)"
assert_status "GET /api/projects/:id/issues" "200" "$STATUS" "$BODY"
ISSUE_COUNT=$(echo "$BODY" | jq 'length')
echo -e "    (Found $ISSUE_COUNT issues)"

# Create issue - Task
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Test task","type":"task","priority":"medium"}')"
assert_status "Create task issue → 201" "201" "$STATUS" "$BODY"
TASK_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Task has correct type" "$BODY" ".type" "task"
assert_json_not_empty "Task has issueNumber" "$BODY" ".issueNumber"

# Create issue - Epic
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Test epic","type":"epic","priority":"high"}')"
assert_status "Create epic issue → 201" "201" "$STATUS" "$BODY"
EPIC_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Epic has correct type" "$BODY" ".type" "epic"

# Create issue - Story
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Test story","type":"story","priority":"low","storyPoints":5}')"
assert_status "Create story with story points → 201" "201" "$STATUS" "$BODY"
STORY_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Story has correct points" "$BODY" ".storyPoints" "5"

# Create issue - Bug
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Test bug","type":"bug","priority":"highest"}')"
assert_status "Create bug issue → 201" "201" "$STATUS" "$BODY"
BUG_ID=$(echo "$BODY" | jq -r '.id')

# Create issue - Sub-task with parent
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Test sub-task","type":"sub_task","priority":"medium","parentId":"'"$TASK_ID"'"}')"
assert_status "Create sub-task → 201" "201" "$STATUS" "$BODY"
SUBTASK_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Sub-task has parent" "$BODY" ".parentId" "$TASK_ID"

# Create issue with missing title
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"type":"task","priority":"medium"}')"
assert_status "Create issue without title → 400" "400" "$STATUS" "$BODY"

# Create issue with invalid type
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Bad type","type":"invalid","priority":"medium"}')"
assert_status "Create issue with invalid type → 400" "400" "$STATUS" "$BODY"

# Create issue with all fields
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Full issue","type":"story","priority":"high","status":"in_progress","storyPoints":8,"description":"Full description","originalEstimate":120}')"
assert_status "Create issue with all fields → 201" "201" "$STATUS" "$BODY"
FULL_ISSUE_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Full issue has estimate" "$BODY" ".originalEstimate" "120"

# Get single issue
parse_response "$(api GET /api/issues/$TASK_ID)"
assert_status "GET /api/issues/:id" "200" "$STATUS" "$BODY"
assert_json_field "Issue has correct id" "$BODY" ".id" "$TASK_ID"

# Get nonexistent issue
parse_response "$(api GET /api/issues/nonexistent-id)"
assert_status "GET nonexistent issue → 404" "404" "$STATUS" "$BODY"

# Update issue
parse_response "$(api PATCH /api/issues/$TASK_ID '{"title":"Updated task","status":"in_progress","assigneeId":"'"$AUTH_USER_ID"'"}')"
assert_status "PATCH /api/issues/:id" "200" "$STATUS" "$BODY"
assert_json_field "Updated issue title" "$BODY" ".title" "Updated task"
assert_json_field "Updated issue status" "$BODY" ".status" "in_progress"
assert_json_field "Updated issue assignee" "$BODY" ".assigneeId" "$AUTH_USER_ID"

# Get recent issues
parse_response "$(api GET /api/issues/recent)"
assert_status "GET /api/issues/recent" "200" "$STATUS" "$BODY"

# Get child issues
parse_response "$(api GET /api/issues/$TASK_ID/children)"
assert_status "GET /api/issues/:id/children" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Task has child sub-task" "$BODY" "0"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4] COMMENTS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Create comment
parse_response "$(api POST /api/issues/$TASK_ID/comments '{"content":"Test comment"}')"
assert_status "POST /api/issues/:id/comments → 201" "201" "$STATUS" "$BODY"
assert_json_field "Comment has content" "$BODY" ".content" "Test comment"
assert_json_not_empty "Comment has id" "$BODY" ".id"

# Create empty comment
parse_response "$(api POST /api/issues/$TASK_ID/comments '{"content":""}')"
assert_status "Empty comment → 400" "400" "$STATUS" "$BODY"

# Get comments
parse_response "$(api GET /api/issues/$TASK_ID/comments)"
assert_status "GET /api/issues/:id/comments" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has comments" "$BODY" "0"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5] LABELS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get project labels
parse_response "$(api GET /api/projects/$PROJECT_ID/labels)"
assert_status "GET /api/projects/:id/labels" "200" "$STATUS" "$BODY"
EXISTING_LABEL_COUNT=$(echo "$BODY" | jq 'length')
echo -e "    (Found $EXISTING_LABEL_COUNT labels in main project)"

# Create label
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/labels '{"name":"Test Label","color":"#FF5630"}')"
assert_status "POST /api/projects/:id/labels → 201" "201" "$STATUS" "$BODY"
LABEL_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Label has name" "$BODY" ".name" "Test Label"

# Create label with missing name
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/labels '{"color":"#FF5630"}')"
assert_status "Create label without name → 400" "400" "$STATUS" "$BODY"

# Update label
parse_response "$(api PATCH /api/labels/$LABEL_ID '{"name":"Updated Label","color":"#36B37E"}')"
assert_status "PATCH /api/labels/:id" "200" "$STATUS" "$BODY"
assert_json_field "Updated label name" "$BODY" ".name" "Updated Label"

# Add label to issue
parse_response "$(api POST /api/issues/$TASK_ID/labels '{"labelId":"'"$LABEL_ID"'"}')"
assert_status "POST /api/issues/:id/labels → 201" "201" "$STATUS" "$BODY"

# Get issue labels
parse_response "$(api GET /api/issues/$TASK_ID/labels)"
assert_status "GET /api/issues/:id/labels" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has labels" "$BODY" "0"

# Add duplicate label (should fail with unique constraint)
parse_response "$(api POST /api/issues/$TASK_ID/labels '{"labelId":"'"$LABEL_ID"'"}')"
assert_status "Duplicate label on issue → 400" "400" "$STATUS" "$BODY"

# Remove label from issue
parse_response "$(api DELETE /api/issues/$TASK_ID/labels/$LABEL_ID)"
assert_status "DELETE /api/issues/:issueId/labels/:labelId" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6] COMPONENTS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get project components
parse_response "$(api GET /api/projects/$PROJECT_ID/components)"
assert_status "GET /api/projects/:id/components" "200" "$STATUS" "$BODY"

# Create component
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/components '{"name":"Test Component","description":"A test component"}')"
assert_status "POST /api/projects/:id/components → 201" "201" "$STATUS" "$BODY"
COMPONENT_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Component has name" "$BODY" ".name" "Test Component"

# Update component
parse_response "$(api PATCH /api/components/$COMPONENT_ID '{"name":"Updated Component"}')"
assert_status "PATCH /api/components/:id" "200" "$STATUS" "$BODY"
assert_json_field "Updated component name" "$BODY" ".name" "Updated Component"

# Add component to issue
parse_response "$(api POST /api/issues/$TASK_ID/components '{"componentId":"'"$COMPONENT_ID"'"}')"
assert_status "POST /api/issues/:id/components → 201" "201" "$STATUS" "$BODY"

# Get issue components
parse_response "$(api GET /api/issues/$TASK_ID/components)"
assert_status "GET /api/issues/:id/components" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has components" "$BODY" "0"

# Remove component from issue
parse_response "$(api DELETE /api/issues/$TASK_ID/components/$COMPONENT_ID)"
assert_status "DELETE /api/issues/:issueId/components/:componentId" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[7] VERSIONS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get project versions
parse_response "$(api GET /api/projects/$PROJECT_ID/versions)"
assert_status "GET /api/projects/:id/versions" "200" "$STATUS" "$BODY"

# Create version
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/versions '{"name":"v1.0","description":"First release"}')"
assert_status "POST /api/projects/:id/versions → 201" "201" "$STATUS" "$BODY"
VERSION_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Version has name" "$BODY" ".name" "v1.0"
assert_json_field "Version is unreleased" "$BODY" ".status" "unreleased"

# Update version
parse_response "$(api PATCH /api/versions/$VERSION_ID '{"description":"Updated description"}')"
assert_status "PATCH /api/versions/:id" "200" "$STATUS" "$BODY"

# Release version
parse_response "$(api POST /api/versions/$VERSION_ID/release)"
assert_status "POST /api/versions/:id/release" "200" "$STATUS" "$BODY"
assert_json_field "Version is now released" "$BODY" ".status" "released"
assert_json_not_empty "Released version has releaseDate" "$BODY" ".releaseDate"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[8] SPRINTS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get project sprints
parse_response "$(api GET /api/projects/$PROJECT_ID/sprints)"
assert_status "GET /api/projects/:id/sprints" "200" "$STATUS" "$BODY"
EXISTING_SPRINT_COUNT=$(echo "$BODY" | jq 'length')
echo -e "    (Found $EXISTING_SPRINT_COUNT sprints)"

# Create sprint
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/sprints '{"name":"Sprint 1","goal":"Complete initial features"}')"
assert_status "POST /api/projects/:id/sprints → 201" "201" "$STATUS" "$BODY"
SPRINT_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Sprint has name" "$BODY" ".name" "Sprint 1"
assert_json_field "Sprint is planning" "$BODY" ".status" "planning"

# Create second sprint
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/sprints '{"name":"Sprint 2","goal":"Polish"}')"
assert_status "Create second sprint → 201" "201" "$STATUS" "$BODY"
SPRINT_2_ID=$(echo "$BODY" | jq -r '.id')

# Update sprint
parse_response "$(api PATCH /api/sprints/$SPRINT_ID '{"goal":"Updated goal"}')"
assert_status "PATCH /api/sprints/:id" "200" "$STATUS" "$BODY"

# Start sprint
parse_response "$(api POST /api/sprints/$SPRINT_ID/start)"
assert_status "POST /api/sprints/:id/start → 200" "200" "$STATUS" "$BODY"
assert_json_field "Sprint is now active" "$BODY" ".status" "active"

# Try to start second sprint while one is active
parse_response "$(api POST /api/sprints/$SPRINT_2_ID/start)"
assert_status "Start second sprint → 409 (conflict)" "409" "$STATUS" "$BODY"

# Assign issue to sprint
parse_response "$(api PATCH /api/issues/$TASK_ID '{"sprintId":"'"$SPRINT_ID"'"}')"
assert_status "Assign issue to sprint" "200" "$STATUS" "$BODY"

# Get sprint issues
parse_response "$(api GET /api/sprints/$SPRINT_ID/issues)"
assert_status "GET /api/sprints/:id/issues" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Sprint has issues" "$BODY" "0"

# Complete sprint (moves incomplete issues to backlog)
parse_response "$(api POST /api/sprints/$SPRINT_ID/complete)"
assert_status "POST /api/sprints/:id/complete → 200" "200" "$STATUS" "$BODY"
assert_json_field "Sprint is completed" "$BODY" ".status" "completed"

# Verify incomplete issue moved to backlog
parse_response "$(api GET /api/issues/$TASK_ID)"
if [ "$(echo "$BODY" | jq -r '.sprintId')" = "null" ]; then
  echo -e "  ${GREEN}✓${NC} Incomplete issue moved to backlog (sprintId = null)"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Issue should have been moved to backlog"
  ((FAIL++))
  ERRORS+=("Sprint complete: incomplete issue not moved to backlog")
fi

# Sprint burndown
parse_response "$(api GET /api/sprints/$SPRINT_ID/burndown)"
assert_status "GET /api/sprints/:id/burndown" "200" "$STATUS" "$BODY"

# Sprint report
parse_response "$(api GET /api/sprints/$SPRINT_ID/report)"
assert_status "GET /api/sprints/:id/report" "200" "$STATUS" "$BODY"
assert_json_not_empty "Sprint report has stats" "$BODY" ".stats"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[9] ISSUE LINKS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Create issue link
parse_response "$(api POST /api/issues/$TASK_ID/links '{"targetIssueId":"'"$BUG_ID"'","linkType":"blocks"}')"
assert_status "POST /api/issues/:id/links → 201" "201" "$STATUS" "$BODY"
LINK_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Link has correct type" "$BODY" ".linkType" "blocks"

# Create link with invalid type
parse_response "$(api POST /api/issues/$TASK_ID/links '{"targetIssueId":"'"$STORY_ID"'","linkType":"invalid_type"}')"
assert_status "Create link with invalid type → 400" "400" "$STATUS" "$BODY"

# Get issue links
parse_response "$(api GET /api/issues/$TASK_ID/links)"
assert_status "GET /api/issues/:id/links" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has links" "$BODY" "0"

# Delete issue link
parse_response "$(api DELETE /api/issue-links/$LINK_ID)"
assert_status "DELETE /api/issue-links/:id" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[10] ACTIVITY LOG${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get issue activity
parse_response "$(api GET /api/issues/$TASK_ID/activity)"
assert_status "GET /api/issues/:id/activity" "200" "$STATUS" "$BODY"

# Get project activity
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/activity)"
assert_status "GET /api/projects/:id/activity" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[11] WATCHERS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Watch issue
parse_response "$(api POST /api/issues/$TASK_ID/watch)"
assert_status "POST /api/issues/:id/watch → 201" "201" "$STATUS" "$BODY"

# Watch again (should fail - duplicate)
parse_response "$(api POST /api/issues/$TASK_ID/watch)"
assert_status "Watch duplicate → 400" "400" "$STATUS" "$BODY"

# Get watchers
parse_response "$(api GET /api/issues/$TASK_ID/watchers)"
assert_status "GET /api/issues/:id/watchers" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has watchers" "$BODY" "0"

# Unwatch
parse_response "$(api DELETE /api/issues/$TASK_ID/watch)"
assert_status "DELETE /api/issues/:id/watch" "200" "$STATUS" "$BODY"

# Get my watching
parse_response "$(api GET /api/me/watching)"
assert_status "GET /api/me/watching" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[12] NOTIFICATIONS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get notifications
parse_response "$(api GET /api/notifications)"
assert_status "GET /api/notifications" "200" "$STATUS" "$BODY"

# Get unread count
parse_response "$(api GET /api/notifications/unread-count)"
assert_status "GET /api/notifications/unread-count" "200" "$STATUS" "$BODY"
assert_json_not_empty "Has count field" "$BODY" ".count"

# Mark all read
parse_response "$(api POST /api/notifications/mark-all-read)"
assert_status "POST /api/notifications/mark-all-read" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[13] WORK LOGS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Create work log
parse_response "$(api POST /api/issues/$TASK_ID/worklogs '{"timeSpent":60,"description":"Fixed the issue"}')"
assert_status "POST /api/issues/:id/worklogs → 201" "201" "$STATUS" "$BODY"
WORKLOG_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Work log has time" "$BODY" ".timeSpent" "60"

# Verify issue timeSpent updated
parse_response "$(api GET /api/issues/$TASK_ID)"
assert_json_field "Issue timeSpent updated" "$BODY" ".timeSpent" "60"

# Create work log with zero time (edge case)
parse_response "$(api POST /api/issues/$TASK_ID/worklogs '{"timeSpent":0,"description":"Zero time"}')"
# Should still succeed since 0 is a valid integer
if [ "$STATUS" = "201" ] || [ "$STATUS" = "400" ]; then
  echo -e "  ${GREEN}✓${NC} Zero time work log handled ($STATUS)"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Zero time work log unexpected status ($STATUS)"
  ((FAIL++))
fi

# Get work logs
parse_response "$(api GET /api/issues/$TASK_ID/worklogs)"
assert_status "GET /api/issues/:id/worklogs" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has work logs" "$BODY" "0"

# Delete work log
parse_response "$(api DELETE /api/worklogs/$WORKLOG_ID)"
assert_status "DELETE /api/worklogs/:id" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[14] ATTACHMENTS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Create attachment
parse_response "$(api POST /api/issues/$TASK_ID/attachments '{"filename":"test.txt","mimeType":"text/plain","size":12,"data":"SGVsbG8gV29ybGQ="}')"
assert_status "POST /api/issues/:id/attachments → 201" "201" "$STATUS" "$BODY"
ATTACHMENT_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Attachment has filename" "$BODY" ".filename" "test.txt"

# Get attachment
parse_response "$(api GET /api/attachments/$ATTACHMENT_ID)"
assert_status "GET /api/attachments/:id" "200" "$STATUS" "$BODY"
assert_json_field "Attachment has data" "$BODY" ".data" "SGVsbG8gV29ybGQ="

# Get nonexistent attachment
parse_response "$(api GET /api/attachments/nonexistent-id)"
assert_status "GET nonexistent attachment → 404" "404" "$STATUS" "$BODY"

# Get issue attachments
parse_response "$(api GET /api/issues/$TASK_ID/attachments)"
assert_status "GET /api/issues/:id/attachments" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Issue has attachments" "$BODY" "0"

# Delete attachment
parse_response "$(api DELETE /api/attachments/$ATTACHMENT_ID)"
assert_status "DELETE /api/attachments/:id" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[15] SEARCH${NC}"
# ──────────────────────────────────────────────────────────────────────

# Global search
parse_response "$(api GET '/api/search?q=Test')"
assert_status "GET /api/search?q=Test" "200" "$STATUS" "$BODY"
assert_json_not_empty "Search has issues array" "$BODY" ".issues"

# Empty search
parse_response "$(api GET '/api/search?q=')"
assert_status "GET /api/search?q= (empty)" "200" "$STATUS" "$BODY"

# Issue search with filters
parse_response "$(api GET '/api/issues/search?type=task')"
assert_status "GET /api/issues/search?type=task" "200" "$STATUS" "$BODY"
assert_json_not_empty "Search has issues" "$BODY" ".issues"

parse_response "$(api GET '/api/issues/search?status=in_progress')"
assert_status "GET /api/issues/search?status=in_progress" "200" "$STATUS" "$BODY"

parse_response "$(api GET '/api/issues/search?priority=highest')"
assert_status "GET /api/issues/search?priority=highest" "200" "$STATUS" "$BODY"

parse_response "$(api GET '/api/issues/search?text=Test')"
assert_status "GET /api/issues/search?text=Test" "200" "$STATUS" "$BODY"

# Search with pagination
parse_response "$(api GET '/api/issues/search?page=1&sortBy=created')"
assert_status "GET /api/issues/search with pagination" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[16] SAVED FILTERS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Create saved filter
parse_response "$(api POST /api/saved-filters '{"name":"My Tasks","projectId":"'"$TEST_PROJECT_ID"'","filterJson":{"type":"task","status":"todo"}}')"
assert_status "POST /api/saved-filters → 201" "201" "$STATUS" "$BODY"
FILTER_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "Filter has name" "$BODY" ".name" "My Tasks"

# Get saved filters
parse_response "$(api GET /api/saved-filters)"
assert_status "GET /api/saved-filters" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Has saved filters" "$BODY" "0"

# Delete saved filter
parse_response "$(api DELETE /api/saved-filters/$FILTER_ID)"
assert_status "DELETE /api/saved-filters/:id" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[17] FAVORITES${NC}"
# ──────────────────────────────────────────────────────────────────────

# Add project favorite
parse_response "$(api POST /api/favorites '{"projectId":"'"$TEST_PROJECT_ID"'"}')"
assert_status "POST /api/favorites (project) → 201" "201" "$STATUS" "$BODY"
FAV_ID=$(echo "$BODY" | jq -r '.id')

# Get favorites
parse_response "$(api GET /api/me/favorites)"
assert_status "GET /api/me/favorites" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Has favorites" "$BODY" "0"

# Remove favorite
parse_response "$(api DELETE /api/favorites/$FAV_ID)"
assert_status "DELETE /api/favorites/:id" "200" "$STATUS" "$BODY"

# Add issue favorite
parse_response "$(api POST /api/favorites '{"issueId":"'"$TASK_ID"'"}')"
assert_status "POST /api/favorites (issue) → 201" "201" "$STATUS" "$BODY"
FAV_ISSUE_ID=$(echo "$BODY" | jq -r '.id')
parse_response "$(api DELETE /api/favorites/$FAV_ISSUE_ID)"
assert_status "Remove issue favorite" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[18] MY WORK${NC}"
# ──────────────────────────────────────────────────────────────────────

# My assigned issues
parse_response "$(api GET /api/me/assigned)"
assert_status "GET /api/me/assigned" "200" "$STATUS" "$BODY"

# My reported issues
parse_response "$(api GET /api/me/reported)"
assert_status "GET /api/me/reported" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[19] PROJECT MEMBERS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get project members
parse_response "$(api GET /api/projects/$PROJECT_ID/members)"
assert_status "GET /api/projects/:id/members" "200" "$STATUS" "$BODY"
MEMBER_COUNT=$(echo "$BODY" | jq 'length')
echo -e "    (Found $MEMBER_COUNT members)"

# Add project member
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/members '{"userId":"'"$AUTH_USER_ID"'","role":"member"}')"
assert_status "POST /api/projects/:id/members → 201" "201" "$STATUS" "$BODY"
MEMBER_ID=$(echo "$BODY" | jq -r '.id')

# Update member role (using standalone route)
parse_response "$(api PATCH /api/project-members/$MEMBER_ID '{"role":"project_admin"}')"
assert_status "PATCH /api/project-members/:id" "200" "$STATUS" "$BODY"

# Remove member (using standalone route)
parse_response "$(api DELETE /api/project-members/$MEMBER_ID)"
assert_status "DELETE /api/project-members/:id" "200" "$STATUS" "$BODY"

# Also test nested member routes that frontend uses
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/members '{"userId":"'"$AUTH_USER_ID"'","role":"member"}')"
MEMBER_ID_2=$(echo "$BODY" | jq -r '.id')

# Test PATCH via nested route (frontend uses this)
parse_response "$(api PATCH /api/projects/$TEST_PROJECT_ID/members/$MEMBER_ID_2 '{"role":"viewer"}')"
IS_JSON=$(echo "$BODY" | jq empty 2>/dev/null && echo "yes" || echo "no")
if [ "$STATUS" = "200" ] && [ "$IS_JSON" = "yes" ]; then
  echo -e "  ${GREEN}✓${NC} PATCH nested member route returns JSON"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} PATCH /api/projects/:projectId/members/:memberId → $STATUS (JSON: $IS_JSON)"
  ((FAIL++))
  ERRORS+=("MISSING ROUTE: PATCH /api/projects/:projectId/members/:memberId (frontend uses this)")
fi

# Test DELETE via nested route (frontend uses this)
parse_response "$(api DELETE /api/projects/$TEST_PROJECT_ID/members/$MEMBER_ID_2)"
IS_JSON=$(echo "$BODY" | jq empty 2>/dev/null && echo "yes" || echo "no")
if [ "$STATUS" = "200" ] && [ "$IS_JSON" = "yes" ]; then
  echo -e "  ${GREEN}✓${NC} DELETE nested member route returns JSON"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} DELETE /api/projects/:projectId/members/:memberId → $STATUS (JSON: $IS_JSON)"
  ((FAIL++))
  ERRORS+=("MISSING ROUTE: DELETE /api/projects/:projectId/members/:memberId (frontend uses this)")
fi

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[20] BOARD CONFIG${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get board config (empty initially)
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/board-config)"
assert_status "GET /api/projects/:id/board-config" "200" "$STATUS" "$BODY"

# Save board config
parse_response "$(api PATCH /api/projects/$TEST_PROJECT_ID/board-config '{"swimlaneBy":"assignee","wipLimits":{"todo":5,"in_progress":3},"columnOrder":["todo","in_progress","in_review","done"]}')"
assert_status "PATCH /api/projects/:id/board-config" "200" "$STATUS" "$BODY"
assert_json_field "Board config swimlane" "$BODY" ".swimlaneBy" "assignee"

# Update board config again (should upsert)
parse_response "$(api PATCH /api/projects/$TEST_PROJECT_ID/board-config '{"swimlaneBy":"priority"}')"
assert_status "PATCH board-config upsert" "200" "$STATUS" "$BODY"
assert_json_field "Board config updated swimlane" "$BODY" ".swimlaneBy" "priority"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[21] WORKFLOW${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get workflow (empty initially)
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/workflow)"
assert_status "GET /api/projects/:id/workflow" "200" "$STATUS" "$BODY"

# Save workflow
parse_response "$(api PUT /api/projects/$TEST_PROJECT_ID/workflow '{"name":"Custom Workflow","statuses":["todo","in_progress","done"],"transitions":[{"fromStatus":"todo","toStatus":"in_progress","name":"Start"},{"fromStatus":"in_progress","toStatus":"done","name":"Complete"}]}')"
assert_status "PUT /api/projects/:id/workflow" "200" "$STATUS" "$BODY"

# Get workflow transitions
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/workflow/transitions/todo)"
assert_status "GET workflow transitions from todo" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[22] EPICS / ROADMAP${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get project epics
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/epics)"
assert_status "GET /api/projects/:id/epics" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Project has epics" "$BODY" "0"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[23] VELOCITY & CFD${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get velocity
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/velocity)"
assert_status "GET /api/projects/:id/velocity" "200" "$STATUS" "$BODY"

# Get CFD
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/cfd)"
assert_status "GET /api/projects/:id/cfd" "200" "$STATUS" "$BODY"

parse_response "$(api GET /api/projects/$TEST_PROJECT_ID/cfd?days=7)"
assert_status "GET /api/projects/:id/cfd?days=7" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[24] DASHBOARD GADGETS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get dashboard
parse_response "$(api GET /api/me/dashboard)"
assert_status "GET /api/me/dashboard" "200" "$STATUS" "$BODY"

# Create gadget
parse_response "$(api POST /api/me/dashboard/gadgets '{"type":"assigned-to-me","position":0}')"
assert_status "POST /api/me/dashboard/gadgets → 201" "201" "$STATUS" "$BODY"
GADGET_ID=$(echo "$BODY" | jq -r '.id')

# Delete gadget
parse_response "$(api DELETE /api/me/dashboard/gadgets/$GADGET_ID)"
assert_status "DELETE /api/me/dashboard/gadgets/:id" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[25] BULK OPERATIONS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Bulk update issues
parse_response "$(api POST /api/issues/bulk '{"issueIds":["'"$TASK_ID"'","'"$BUG_ID"'"],"updates":{"priority":"low"}}')"
assert_status "POST /api/issues/bulk" "200" "$STATUS" "$BODY"

# Verify bulk update
parse_response "$(api GET /api/issues/$TASK_ID)"
assert_json_field "Bulk updated task priority" "$BODY" ".priority" "low"
parse_response "$(api GET /api/issues/$BUG_ID)"
assert_json_field "Bulk updated bug priority" "$BODY" ".priority" "low"

# Bulk with empty array
parse_response "$(api POST /api/issues/bulk '{"issueIds":[],"updates":{"priority":"high"}}')"
assert_status "Bulk update empty array" "200" "$STATUS" "$BODY"

# Bulk without issueIds
parse_response "$(api POST /api/issues/bulk '{"updates":{"priority":"high"}}')"
assert_status "Bulk without issueIds → 400" "400" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[26] USERS${NC}"
# ──────────────────────────────────────────────────────────────────────

# Get all users
parse_response "$(api GET /api/users)"
assert_status "GET /api/users" "200" "$STATUS" "$BODY"
assert_json_array_length_gt "Has at least 1 user" "$BODY" "0"

# Test user search route (used by Members tab)
parse_response "$(api GET '/api/users/search?q=dev')"
IS_JSON=$(echo "$BODY" | jq empty 2>/dev/null && echo "yes" || echo "no")
if [ "$STATUS" = "200" ] && [ "$IS_JSON" = "yes" ]; then
  echo -e "  ${GREEN}✓${NC} GET /api/users/search returns JSON"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} GET /api/users/search → $STATUS (JSON: $IS_JSON) (frontend Members tab needs this route!)"
  ((FAIL++))
  ERRORS+=("MISSING ROUTE: GET /api/users/search?q= (frontend Members tab uses this)")
fi

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[27] EDGE CASES${NC}"
# ──────────────────────────────────────────────────────────────────────

# Very long title
LONG_TITLE=$(printf 'A%.0s' {1..300})
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"'"$LONG_TITLE"'","type":"task","priority":"medium"}')"
if [ "$STATUS" = "201" ] || [ "$STATUS" = "400" ]; then
  echo -e "  ${GREEN}✓${NC} Very long title handled ($STATUS)"
  ((PASS++))
else
  echo -e "  ${RED}✗${NC} Very long title unexpected ($STATUS)"
  ((FAIL++))
fi

# Special characters in title
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Test <script>alert(1)</script> & \"quotes\"","type":"task","priority":"medium"}')"
assert_status "Special chars in title → 201" "201" "$STATUS" "$BODY"

# Unicode in title
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"テスト Issue 🚀 привет","type":"task","priority":"medium"}')"
assert_status "Unicode in title → 201" "201" "$STATUS" "$BODY"

# Null description
parse_response "$(api POST /api/projects/$TEST_PROJECT_ID/issues '{"title":"Null desc","type":"task","priority":"medium","description":null}')"
assert_status "Null description → 201" "201" "$STATUS" "$BODY"

# Update issue with null values
parse_response "$(api PATCH /api/issues/$TASK_ID '{"assigneeId":null,"sprintId":null}')"
assert_status "Update issue with null values" "200" "$STATUS" "$BODY"

# SQL injection attempt in search
parse_response "$(api GET '/api/search?q=test%27%20OR%201=1--')"
assert_status "SQL injection in search → 200 (safe)" "200" "$STATUS" "$BODY"

# SQL injection in issue search
parse_response "$(api GET '/api/issues/search?text=test%27%20OR%201=1--')"
assert_status "SQL injection in issue search → 200 (safe)" "200" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[28] CLEANUP${NC}"
# ──────────────────────────────────────────────────────────────────────

# Delete test issues
parse_response "$(api DELETE /api/issues/$SUBTASK_ID)"
assert_status "Delete sub-task" "200" "$STATUS" "$BODY"

parse_response "$(api DELETE /api/issues/$TASK_ID)"
assert_status "Delete task" "200" "$STATUS" "$BODY"

parse_response "$(api DELETE /api/issues/$BUG_ID)"
assert_status "Delete bug" "200" "$STATUS" "$BODY"

# Delete test project (cascading delete)
parse_response "$(api DELETE /api/projects/$TEST_PROJECT_ID)"
assert_status "Delete test project (cascade)" "200" "$STATUS" "$BODY"

# Verify test project deleted
parse_response "$(api GET /api/projects/$TEST_PROJECT_ID)"
assert_status "Deleted project returns 404" "404" "$STATUS" "$BODY"

echo ""

# ──────────────────────────────────────────────────────────────────────
echo "================================================================"
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}"
echo "================================================================"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed tests:${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}• $err${NC}"
  done
fi

echo ""

# Clean up
rm -f "$COOKIE_JAR"

exit $FAIL
