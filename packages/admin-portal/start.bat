@echo off
cd /d C:\inetpub\wwwroot\drivers-admin
set NODE_ENV=production
set PORT=5002
node_modules\.bin\next start -p 5002
