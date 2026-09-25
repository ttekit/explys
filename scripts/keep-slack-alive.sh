#!/usr/bin/env bash
# ==============================================================================
# Explys Slack QA Bot Keep-Alive Supervisor
# Keeps `slack run` (or `node app.js`) running continuously in the background
# or foreground, automatically restarting if it crashes or disconnects.
# ==============================================================================

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SLACK_DIR="${PROJECT_ROOT}/explysslack"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}🤖 Explys Slack Bot Keep-Alive Supervisor${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Load environment variables from backend/.env if available
BACKEND_ENV="${PROJECT_ROOT}/backend/.env"
if [ -f "$BACKEND_ENV" ]; then
  echo -e "📄 Loading environment keys from ${YELLOW}backend/.env${NC}..."
  # Export non-comment lines without overwriting existing environment vars
  while IFS='=' read -r key val || [ -n "$key" ]; do
    # Trim leading whitespace and skip comments/empty
    key=$(echo "$key" | sed -e 's/^[[:space:]]*//')
    if [[ ! "$key" =~ ^# && -n "$key" && -n "$val" ]]; then
      # Strip quotes
      val=$(echo "$val" | sed -e 's/^["'\'']//' -e 's/["'\'']$//')
      if [ -z "${!key:-}" ]; then
        export "$key"="$val"
      fi
    fi
  done < "$BACKEND_ENV"
fi

# Also check explysslack/.env if present
SLACK_ENV="${SLACK_DIR}/.env"
if [ -f "$SLACK_ENV" ]; then
  echo -e "📄 Loading environment keys from ${YELLOW}explysslack/.env${NC}..."
  while IFS='=' read -r key val || [ -n "$key" ]; do
    key=$(echo "$key" | sed -e 's/^[[:space:]]*//')
    if [[ ! "$key" =~ ^# && -n "$key" && -n "$val" ]]; then
      val=$(echo "$val" | sed -e 's/^["'\'']//' -e 's/["'\'']$//')
      if [ -z "${!key:-}" ]; then
        export "$key"="$val"
      fi
    fi
  done < "$SLACK_ENV"
fi

# Ensure Slack CLI or npm start can be found
cd "$SLACK_DIR" || exit 1

SLACK_CMD="slack"
if ! command -v "$SLACK_CMD" &> /dev/null; then
  if [ -f "$HOME/.local/bin/slack" ]; then
    SLACK_CMD="$HOME/.local/bin/slack"
  else
    echo -e "${YELLOW}⚠️ 'slack' CLI not found in PATH. Falling back to 'npm start' (node app.js)...${NC}"
    SLACK_CMD=""
  fi
fi

# Graceful shutdown handler
CHILD_PID=0
shutdown() {
  echo -e "\n${YELLOW}🛑 Shutting down Slack Bot Supervisor...${NC}"
  if [ "$CHILD_PID" -ne 0 ] && kill -0 "$CHILD_PID" 2>/dev/null; then
    kill -TERM "$CHILD_PID" 2>/dev/null || true
    wait "$CHILD_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}✅ Slack Bot stopped.${NC}"
  exit 0
}

trap shutdown SIGINT SIGTERM

RESTART_COUNT=0

while true; do
  RESTART_COUNT=$((RESTART_COUNT + 1))
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  
  echo -e "\n${GREEN}🚀 [${TIMESTAMP}] Starting Explys Slack Bot (Run #${RESTART_COUNT})...${NC}"
  
  START_TIME=$(date +%s)
  
  if [ -n "$SLACK_CMD" ]; then
    "$SLACK_CMD" run &
    CHILD_PID=$!
  else
    node app.js &
    CHILD_PID=$!
  fi

  # Wait for child process to finish or crash
  wait "$CHILD_PID" 2>/dev/null
  EXIT_CODE=$?
  CHILD_PID=0
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "${RED}⚠️ [${TIMESTAMP}] Bot process exited (Code: ${EXIT_CODE}, Uptime: ${DURATION}s).${NC}"

  # Backoff if dying immediately (<3 seconds) to avoid CPU pegging
  if [ "$DURATION" -lt 3 ]; then
    echo -e "${YELLOW}⏳ Process exited very quickly. Waiting 5s before restarting...${NC}"
    sleep 5
  else
    echo -e "${YELLOW}🔄 Restarting in 1s... (Press Ctrl+C to stop)${NC}"
    sleep 1
  fi
done
