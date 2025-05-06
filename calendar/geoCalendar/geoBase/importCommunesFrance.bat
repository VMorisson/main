@echo off
echo 📦 Import des villes dans MongoDB Atlas...

REM Modifier ce chemin si besoin
set "JSON_FILE=C:\Users\moris\Documents\LAUREA Integration\calendar\geoCalendar\geoBase\communes-france.json"

REM Mettre ici le chemin de mongoimport s’il n’est pas dans le PATH
set "MONGOIMPORT=C:\Users\moris\Documents\mongo-tools\bin\mongoimport.exe"


REM Import en JSON Array
%MONGOIMPORT% --uri "mongodb+srv://laureadmin:L4URE4@laureaintegration.wcvsdov.mongodb.net/laureaintegration" ^
  --collection villes ^
  --drop ^
  --file "%JSON_FILE%" ^
  --jsonArray

pause
