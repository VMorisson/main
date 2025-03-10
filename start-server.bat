@echo off
REM Se placer dans le répertoire du projet
cd "C:\Users\moris\Documents\LAUREA Integration"

:restart
echo Démarrage du serveur...
node server.js

echo Le serveur s'est arrêté. Redémarrage dans 5 secondes...
timeout /t 5 /nobreak >nul
goto restart
