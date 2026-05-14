#!/usr/bin/env bash
# Pre-tool guard for articulos_pendientes (Linux/macOS)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
TOOL_INPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('tool_input',{})))" 2>/dev/null)

if [ -z "$TOOL_NAME" ]; then exit 0; fi

# Warn when editing critical files
CRITICAL_FILES=("src/db.js" "src/middleware.js" "server.js" ".env" "package.json")
if [[ "$TOOL_NAME" == "create_file" || "$TOOL_NAME" == "replace_string_in_file" ]]; then
    FILE_PATH=$(echo "$TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('filePath', d.get('path','')))" 2>/dev/null)
    for critical in "${CRITICAL_FILES[@]}"; do
        if [[ "$FILE_PATH" == *"$critical"* ]]; then
            echo "{\"continue\":true,\"systemMessage\":\"⚠️  CRITICAL FILE: You are editing '$critical'. Double-check that security rules, DB helpers, and auth middleware remain intact after this change.\"}"
            exit 0
        fi
    done
fi

# Warn on destructive shell commands
if [[ "$TOOL_NAME" == "run_in_terminal" ]]; then
    COMMAND=$(echo "$TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)
    DANGEROUS="rm -rf|git reset --hard|git push --force|DROP TABLE|db.dropDatabase"
    if echo "$COMMAND" | grep -qE "$DANGEROUS"; then
        echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"Potentially destructive command detected. Please confirm this is intentional.\"}}"
        exit 0
    fi
fi

exit 0
