# Run this script to start the dev server with TLS bypass
# Required on Windows when antivirus/firewall does SSL inspection
# Usage: ./dev.ps1

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

# Kill any orphaned theme extension process on port 9293
$p = (netstat -ano | Select-String ':9293' | Where-Object { $_ -match 'LISTENING' } | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
if ($p) {
    Write-Host "Killing orphaned process on port 9293 (PID: $p)..."
    taskkill /F /PID $p
}

shopify app dev
