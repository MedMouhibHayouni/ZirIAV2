@echo off
echo ============================================
echo  ZirIA - Creation de la base de donnees
echo ============================================
set PGPASSWORD=postgres
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE ziria_db;"
if %ERRORLEVEL% EQU 0 (
    echo [OK] Base de donnees ziria_db creee avec succes.
) else (
    echo [INFO] La base de donnees existe peut-etre deja (ou PostgreSQL est sur un autre chemin).
    echo [INFO] Ouvrez pgAdmin 4 et creez manuellement une base nommee: ziria_db
)
echo.
echo Demarrage du serveur NestJS...
echo API:     http://localhost:3000
echo Swagger: http://localhost:3000/api
echo.
pause
