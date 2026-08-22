# Script elevado: crea la regla de firewall para que GESTARIAN cargue desde el
# movil / otros dispositivos de la misma red local (puertos Vite 5173 y 5174).
$result = 'c:\Users\Administrador\Desktop\JUANI\VS CODE\_firewall_result.txt'
Remove-Item $result -ErrorAction SilentlyContinue

$isAdmin = ([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  'NO_ADMIN' | Set-Content $result
  exit 1
}

try {
  $existing = Get-NetFirewallRule -DisplayName 'GESTARIAN Vite Dev (5173-5174)' -ErrorAction SilentlyContinue
  if (-not $existing) {
    New-NetFirewallRule -DisplayName 'GESTARIAN Vite Dev (5173-5174)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173,5174 -Profile Any -ErrorAction Stop | Out-Null
    'RULE_CREATED' | Set-Content $result
  } else {
    'RULE_ALREADY_EXISTS' | Set-Content $result
  }
} catch {
  'RULE_ERROR: ' + $_.Exception.Message | Set-Content $result
  exit 1
}
