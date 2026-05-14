#!/usr/bin/env bash
# Post-edit reminder for articulos_pendientes (Linux/macOS)

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
if [ -z "$TOOL_NAME" ]; then exit 0; fi

EDIT_TOOLS=("create_file" "replace_string_in_file" "multi_replace_string_in_file")
MATCH=0
for t in "${EDIT_TOOLS[@]}"; do [[ "$TOOL_NAME" == "$t" ]] && MATCH=1 && break; done
if [ $MATCH -eq 0 ]; then exit 0; fi

FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); ti=d.get('tool_input',{}); print(ti.get('filePath', ti.get('path','')))" 2>/dev/null)

REMINDERS=""

if echo "$FILE_PATH" | grep -qE "src/routes/"; then
    REMINDERS="$REMINDERS\n📝 Route file modified — update docs/develop.md with any new/changed endpoints."
    REMINDERS="$REMINDERS\n📋 Update CHANGELOG.md under [Unreleased] with this change."
fi

if echo "$FILE_PATH" | grep -qE "src/tasks/"; then
    REMINDERS="$REMINDERS\n📝 Task file modified — update docs/synctasks.md if a task was added or changed."
    REMINDERS="$REMINDERS\n📋 Update CHANGELOG.md under [Unreleased] with this change."
fi

if echo "$FILE_PATH" | grep -qE "server\.js$"; then
    REMINDERS="$REMINDERS\n📝 server.js modified — if new env vars or middleware were added, update README.md and docs/setup.md."
fi

if echo "$FILE_PATH" | grep -qE "package\.json$"; then
    REMINDERS="$REMINDERS\n📝 package.json modified — update docs/install.md if a new dependency was added."
fi

if [ -n "$REMINDERS" ]; then
    MSG="REMINDER after file edit:$REMINDERS"
    python3 -c "import json,sys; print(json.dumps({'systemMessage': sys.argv[1]}))" "$MSG"
fi

exit 0
