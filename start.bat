@echo off
start cmd /k "uvicorn server:app --reload --port 3000"
start cmd /k "npm run dev"
