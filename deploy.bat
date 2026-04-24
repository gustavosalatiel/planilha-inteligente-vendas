@echo off
cd /d "%~dp0"
echo ===============================================
echo  Deploy da Planilla Inteligente
echo ===============================================
echo.

if exist ".git\index.lock" (
  echo Removendo lockfile antigo...
  del /f ".git\index.lock" 2>nul
)

echo.
echo [1/3] Adicionando arquivos...
git add -A

echo.
echo [2/3] Criando commit...
git commit -m "perf: optimize performance, lazy-load video, content-visibility, fix CLS"

echo.
echo [3/3] Enviando para GitHub (isso dispara o deploy no Vercel)...
git push origin main

echo.
echo ===============================================
echo  Deploy enviado! Acompanhe em:
echo  https://vercel.com/dashboard
echo ===============================================
echo.
pause
