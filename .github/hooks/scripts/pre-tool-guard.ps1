# Pre-tool guard for articulos_pendientes
# Reads JSON from stdin, blocks or warns on dangerous operations

$inputJson = $input | ConvertFrom-Json -ErrorAction SilentlyContinue
if (-not $inputJson) { exit 0 }

$toolName = $inputJson.tool_name
$toolInput = $inputJson.tool_input

# Block destructive file operations on critical project files
$criticalFiles = @("src/db.js", "src/middleware.js", "server.js", ".env", "package.json")
if ($toolName -eq "create_file" -or $toolName -eq "replace_string_in_file") {
    $filePath = ""
    if ($toolInput -ne $null) {
        if ($toolInput.filePath -and $toolInput.filePath.ToString().Trim() -ne "") {
            $filePath = $toolInput.filePath.ToString()
        } elseif ($toolInput.path -and $toolInput.path.ToString().Trim() -ne "") {
            $filePath = $toolInput.path.ToString()
        }
    }
    foreach ($critical in $criticalFiles) {
        if ($filePath -match [regex]::Escape($critical)) {
            $output = @{
                continue      = $true
                systemMessage = "⚠️  CRITICAL FILE: You are editing '$critical'. Double-check that security rules, DB helpers, and auth middleware remain intact after this change."
            } | ConvertTo-Json -Compress
            Write-Output $output
            exit 0
        }
    }
}

# Warn before running potentially destructive shell commands
if ($toolName -eq "run_in_terminal") {
    $command = ""
    if ($toolInput -ne $null -and $toolInput.command) {
        $command = $toolInput.command.ToString()
    }
    $dangerousPatterns = @("rm -rf", "Remove-Item.*-Recurse.*-Force", "git reset --hard", "git push --force", "DROP TABLE", "db.dropDatabase", "npm run.*prod")
    foreach ($pattern in $dangerousPatterns) {
        if ($command -match $pattern) {
            $output = @{
                hookSpecificOutput = @{
                    hookEventName          = "PreToolUse"
                    permissionDecision     = "ask"
                    permissionDecisionReason = "Potentially destructive command detected: '$command'. Please confirm this is intentional."
                }
            } | ConvertTo-Json -Compress -Depth 5
            Write-Output $output
            exit 0
        }
    }
}

exit 0
