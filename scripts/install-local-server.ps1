[CmdletBinding()]
param(
  [switch]$Remove
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$taskName = "NongKyCommunity"

if ($Remove) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Output "Đã gỡ tác vụ khởi động máy chủ $taskName."
  exit 0
}

$serverFile = Join-Path $projectRoot "backend\dist\server.js"
if (-not (Test-Path -LiteralPath $serverFile)) {
  throw "Chưa có bản build. Hãy chạy npm.cmd run build trước."
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$backendDirectory = Join-Path $projectRoot "backend"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$action = New-ScheduledTaskAction -Execute $nodePath -Argument ('"{0}"' -f $serverFile) -WorkingDirectory $backendDirectory
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 3650) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Máy chủ local cho website Nông Kỳ" `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Output "Đã cài máy chủ local. Mở http://localhost:4000 sau khi build và migrate hoàn tất."
