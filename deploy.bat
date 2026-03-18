@echo off
REM Deploy script для автоматической настройки на хосте (Windows)

echo.
echo ========================================
echo 🚀 Запуск deployment скрипта...
echo ========================================
echo.

REM Шаг 1: Потягиваем новый код
echo 📥 Шаг 1: git pull...
git pull
if errorlevel 1 (
    echo ❌ Ошибка при git pull
    exit /b 1
)
echo ✅ Код обновлен
echo.

REM Шаг 2: Создаем админа
echo 👤 Шаг 2: npm run make-admin...
call npm run make-admin
if errorlevel 1 (
    echo ❌ Ошибка при создании админа
    exit /b 1
)
echo ✅ Админ создан
echo.

REM Шаг 3: Информируем о перезагрузке
echo 🔄 Шаг 3: Перезагрузка приложения...
echo ⚠️  Пожалуйста, остановите текущее приложение и перезапустите:
echo    npm start
echo.

echo ========================================
echo ✅ ✅ ✅ Deployment готов! ✅ ✅ ✅
echo ========================================
echo.
echo Вы можете войти в админ панель:
echo   Email: admin@citivoice.local
echo   Password: admin12345
echo.
pause
