@echo off
cd /d C:\inetpub\wwwroot\drivers-public
set NODE_ENV=production
set PORT=5003
set NEXT_PUBLIC_API_URL=http://10.40.3.170:5001
node "node_modules\.pnpm\next@14.1.0_react-dom@18.3.1_react@18.3.1__react@18.3.1\node_modules\next\dist\bin\next" start -p 5003
