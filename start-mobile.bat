@echo off
echo ===================================================
echo   Starting EngiBot Mobile (React Native + Expo)
echo ===================================================
echo.
echo 1. Install "Expo Go" on your Android or iPhone.
echo 2. Make sure your phone is connected to the same Wi-Fi.
echo 3. Scan the QR code shown below with Expo Go.
echo.
cd /d "%~dp0mobile"
npx expo start -c
