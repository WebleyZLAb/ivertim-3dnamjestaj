Option Explicit

Dim shell, files, root, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)

If shell.Run("cmd.exe /d /c where node >nul 2>nul", 0, True) <> 0 Then
  MsgBox "IVERTIM Corpus zahtijeva Node.js 20.19+ ili 22.12+. Instaliraj Node.js, pa ponovo dvaput klikni ovaj fajl.", 16, "IVERTIM Corpus"
  WScript.Quit 1
End If

command = "cmd.exe /d /s /c ""cd /d """ & root & """ && node scripts\start-corpus.mjs"""
exitCode = shell.Run(command, 0, True)

If exitCode <> 0 Then
  MsgBox "IVERTIM Corpus nije pokrenut. Detalji su u %LOCALAPPDATA%\IVERTIM Corpus\launcher.log.", 16, "IVERTIM Corpus"
End If
