# FINAL-STEPS.ps1
# Rodar no PowerShell do Windows dentro da pasta do repo.
# Uso:
#   cd "c:\Users\gusta\OneDrive\PASTA CLOUD\PAGINA DE VENDAS - PLANILHA INTELIGENTE"
#   powershell -ExecutionPolicy Bypass -File .\FINAL-STEPS.ps1

$ErrorActionPreference = "Stop"
Set-Location "c:\Users\gusta\OneDrive\PASTA CLOUD\PAGINA DE VENDAS - PLANILHA INTELIGENTE"

Write-Host "=== 1) Limpar lock do git se houver ===" -ForegroundColor Cyan
if (Test-Path ".git/index.lock") { Remove-Item ".git/index.lock" -Force }

Write-Host "=== 2) npm run build ===" -ForegroundColor Cyan
npm run build

Write-Host "=== 3) git add seletivo ===" -ForegroundColor Cyan
git add index.html
git add gracias.html
git add src
git add api
git add scripts
git add gtm
git add cloudflare
git add package.json
git add package-lock.json
git add tsconfig.json
git add tailwind.config.js
git add vercel.json
git add RUNBOOK.md
git add README-tracking.md
git add FINAL-STEPS.ps1
git add .gitignore

Write-Host "=== 4) git status ===" -ForegroundColor Yellow
git status

Write-Host "Revise acima. Se aparecer PNG/JPG/MP4, aborte com Ctrl+C nos proximos 10s." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "=== 5) git commit ===" -ForegroundColor Cyan
$commitMsg = "feat: tracking server-side ponta a ponta + UTMify opcao A"
git commit -m $commitMsg

Write-Host "=== 6) git push ===" -ForegroundColor Cyan
git push origin main

Write-Host "=== 7) Aguardando deploy Vercel (90s) ===" -ForegroundColor Cyan
Start-Sleep -Seconds 90

Write-Host "=== 8) Smoke tests ===" -ForegroundColor Cyan
$env:KIWIFY_WEBHOOK_SECRET = "0ym37o0kbv1"
$env:GTM_WEB_ID = "GTM-PTQ2CST8"
node scripts/smoke-test.mjs

Write-Host "=== 9) Checklist manual restante ===" -ForegroundColor Green
Write-Host "[ ] Lighthouse mobile em https://pagespeed.web.dev/ -> LCP < 2,45s"
Write-Host "[ ] GTM Server: importar gtm/server-container.json + criar Constants (FB_PIXEL_ID, FB_ACCESS_TOKEN secret, FB_TEST_CODE vazio, GA4_MEASUREMENT_ID, GA4_API_SECRET secret) + Publish"
Write-Host "[ ] GTM Web: importar gtm/web-container.json + Publish"
Write-Host "[ ] GTM Server Community Gallery: instalar Facebook Conversions API e Data Tag (by stape-io)"
Write-Host "[ ] Stape: confirmar DNS verification OK"
Write-Host "[ ] Compra real USD 1 -> Purchase aparece UNICA vez no Meta (Dedup=Yes)"
Write-Host "Setup completo." -ForegroundColor Green
