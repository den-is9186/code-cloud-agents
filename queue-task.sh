#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Task Queue Manager
# Fügt Tasks zur Queue hinzu
# ═══════════════════════════════════════════════════════════════

QUEUE_FILE="task-queue.txt"

if [ -z "$1" ]; then
  echo "❌ Error: Task description required"
  echo "Usage: ./queue-task.sh \"Your task description\""
  exit 1
fi

TASK="$1"

# Task zur Queue hinzufügen
echo "$TASK" >> "$QUEUE_FILE"

# Status anzeigen
TOTAL=$(wc -l < "$QUEUE_FILE" | tr -d ' ')

echo "✅ Task added to queue"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Task: $TASK"
echo "Position: #$TOTAL in queue"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Current queue:"
cat -n "$QUEUE_FILE"
