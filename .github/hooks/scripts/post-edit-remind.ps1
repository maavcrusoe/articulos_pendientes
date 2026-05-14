# Post-edit reminder for articulos_pendientes
# After editing route or view files, inject a reminder to update CHANGELOG and docs

$inputJson = $input | ConvertFrom-Json -ErrorAction SilentlyContinue
if (-not $inputJson) { exit 0 }

$toolName = $inputJson.tool_name
$toolInput = $inputJson.tool_input

$editTools = @("create_file", "replace_string_in_file", "multi_replace_string_in_file")
if ($toolName -notin $editTools) { exit 0 }

$filePath = ""
if ($toolInput -ne $null) {
    if ($toolInput.filePath -and $toolInput.filePath.ToString().Trim() -ne "") {
        $filePath = $toolInput.filePath.ToString()
    } elseif ($toolInput.path -and $toolInput.path.ToString().Trim() -ne "") {
        $filePath = $toolInput.path.ToString()
    }
}
$reminders = @()

# Route files → remind to update docs/develop.md and CHANGELOG
if ($filePath -match "src[/\\]routes[/\\]") {
    $reminders += "[DOCS] Route file modified -- update docs/develop.md with any new/changed endpoints."
    $reminders += "[CHANGELOG] Update CHANGELOG.md under [Unreleased] with this change."
}

# Task files → remind to update docs/synctasks.md and CHANGELOG
if ($filePath -match "src[/\\]tasks[/\\]") {
    $reminders += "[DOCS] Task file modified -- update docs/synctasks.md if a task was added or changed."
    $reminders += "[CHANGELOG] Update CHANGELOG.md under [Unreleased] with this change."
}

# server.js → remind about env var and setup docs
if ($filePath -match "server\.js") {
    $reminders += "[DOCS] server.js modified -- if new env vars or middleware were added, update README.md and docs/setup.md."
}

# package.json → remind about install docs
if ($filePath -match "package\.json") {
    $reminders += "[DOCS] package.json modified -- update docs/install.md if a new dependency was added."
}

if ($reminders.Count -gt 0) {
    $message = "REMINDER after file edit:`n" + ($reminders -join "`n")
    $output = @{ systemMessage = $message } | ConvertTo-Json -Compress
    Write-Output $output
}

exit 0
