$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("C:\Users\lucas\OneDrive - SVN Investimentos\Desktop\CRM Assessor.lnk")
$s.TargetPath = "C:\Users\lucas\Desktop\Analise-de-Carteira\iniciar.bat"
$s.WorkingDirectory = "C:\Users\lucas\Desktop\Analise-de-Carteira"
$s.Save()
Write-Host "Atalho criado!"
