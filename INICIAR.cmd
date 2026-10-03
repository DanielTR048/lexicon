@echo off
setlocal
cd /d "%~dp0"
title Lexicon - Laboratorio de Palavras
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20.19 ou superior em https://nodejs.org e tente novamente.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto :error
)
if not exist dist\index.html (
  call npm run build
  if errorlevel 1 goto :error
)
echo.
echo O laboratorio esta em http://127.0.0.1:4184
echo Mantenha esta janela aberta enquanto joga. Ctrl+C encerra o servidor.
echo.
call npm run preview -- --port 4184 --strictPort --open
if errorlevel 1 (
  echo.
  echo Se a porta estiver em uso, acesse http://127.0.0.1:4184 no navegador.
  pause
)
exit /b
:error
echo Nao foi possivel iniciar o jogo. Confira a mensagem acima.
pause
exit /b 1
