param(
  [string]$From,
  [string]$To,
  [string]$Subject = 'test1',
  [string]$Body = 'test1',
  [string]$SmtpServer,
  [int]$Port = 465,
  [switch]$UseSsl = $true,
  [string]$Username,
  [string]$Password
)

if (-not $From -or -not $To -or -not $SmtpServer -or -not $Username -or -not $Password) {
  Write-Error 'Missing required parameters. Provide -From, -To, -SmtpServer, -Username, -Password.'
  exit 1
}

$secure = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($Username, $secure)

Send-MailMessage -From $From -To $To -Subject $Subject -Body $Body -SmtpServer $SmtpServer -Port $Port -UseSsl:$UseSsl -Credential $cred

Write-Host 'Email sent.'
