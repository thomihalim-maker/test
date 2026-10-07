# Marbot Masjid - local web server for Windows (no installs needed).
# Serves the game folder on http://localhost:<port>/ and opens the browser.
# Started by "MAIN-MARBOT-MASJID.bat" in the repository root.
param([string]$Root = (Split-Path -Parent $PSScriptRoot), [int]$Port = 8123)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.woff2' = 'font/woff2'; '.woff' = 'font/woff'; '.txt' = 'text/plain; charset=utf-8'; '.wasm' = 'application/wasm'
}

# Find a free port starting at $Port.
$listener = $null
for ($p = $Port; $p -lt $Port + 20; $p++) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start()
    $listener = $l; $Port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host "Tidak bisa membuka port $Port-$($Port+19). Tutup program lain lalu coba lagi."; Read-Host 'Tekan Enter untuk keluar'; exit 1 }

$url = "http://localhost:$Port/"
Write-Host ''
Write-Host '  ==========================================='
Write-Host '    MARBOT MASJID sedang berjalan'
Write-Host "    Buka: $url"
Write-Host '    Tutup jendela ini untuk berhenti bermain.'
Write-Host '  ==========================================='
Write-Host ''
Start-Process $url

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
    # Never serve files outside the game folder.
    if (-not $full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $res.StatusCode = 404; $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
    } else {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')
      $bytes = [System.IO.File]::ReadAllBytes($full)
    }
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    try { $res.StatusCode = 500 } catch { }
  } finally {
    try { $res.OutputStream.Close() } catch { }
  }
}
