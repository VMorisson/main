@echo off
REM Accéder au dossier contenant l'exécutable mongod.exe
cd "C:\Program Files\MongoDB\Server\8.0\bin"

REM Lancer MongoDB avec le dossier de données spécifié
mongod.exe --dbpath "C:\Users\moris\Documents\LAUREA Integration\db"

REM Optionnel : garder la fenêtre ouverte pour voir les logs
pause
