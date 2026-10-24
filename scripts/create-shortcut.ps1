$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$shortcutShell = New-Object -ComObject WScript.Shell
$shortcut = $shortcutShell.CreateShortcut((Join-Path $projectRoot 'Ivertim 3D.lnk'))
$shortcut.TargetPath = Join-Path $env:WINDIR 'System32/wscript.exe'
$shortcut.Arguments = '"' + (Join-Path $projectRoot 'Pokreni-Ivertim-3D.vbs') + '"'
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = (Join-Path $projectRoot 'public/ivertim-3d-panel.ico') + ',0'
$shortcut.Description = 'Ivertim 3D'
$shortcut.Save()
