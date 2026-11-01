#!/usr/bin/env bash
PORT=3000

# Free up port 3000 if occupied
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true

# Start Next.js production server
npx next start -p $PORT &
SERVER_PID=$!

echo "Waiting for Next.js server to be healthy on port $PORT..."
for i in $(seq 1 30); do
  STATUS=$(curl -s "http://localhost:$PORT/api/health" 2>/dev/null || true)
  if echo "$STATUS" | grep -q "ok"; then
    echo "Server is ready!"
    break
  fi
  sleep 1
done

# Execute pipeline test suite
export TEST_APP_URL="http://localhost:$PORT"
npx tsx scripts/test-all-pipelines.ts
EXIT_CODE=$?

# Terminate Next.js server
kill $SERVER_PID 2>/dev/null || true
exit $EXIT_CODE

