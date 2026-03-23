@echo off
title CRM - Analise de Carteira

echo Iniciando backend...
start "Backend" cmd /k "cd /d C:\Users\lucas\Desktop\Analise-de-Carteira && .venv\Scripts\activate && uvicorn src.main:app --reload"

echo Aguardando backend iniciar...
timeout /t 5 /nobreak > nul

echo Iniciando frontend...
start "Frontend" cmd /k "cd /d C:\Users\lucas\Desktop\Analise-de-Carteira\frontend && npm run dev"

echo Aguardando frontend iniciar...
timeout /t 8 /nobreak > nul

echo Abrindo navegador...
start http://localhost:3000

echo.
echo Sistema iniciado! Pode fechar esta janela.
