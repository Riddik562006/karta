#!/bin/bash
# Deploy script для автоматической настройки на хосте

echo "🚀 Запуск deployment скрипта..."
echo ""

# Шаг 1: Потягиваем новый код
echo "📥 Шаг 1: git pull..."
git pull
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при git pull"
    exit 1
fi
echo "✅ Код обновлен"
echo ""

# Шаг 2: Создаем админа
echo "👤 Шаг 2: npm run make-admin..."
npm run make-admin
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при создании админа"
    exit 1
fi
echo "✅ Админ создан"
echo ""

# Шаг 3: Перезагружаем приложение (для PM2)
echo "🔄 Шаг 3: Перезагрузка приложения..."
if command -v pm2 &> /dev/null; then
    echo "Обнаружен PM2, перезагружаем..."
    pm2 restart karta
    echo "✅ Приложение перезагружено через PM2"
else
    echo "⚠️  PM2 не найден"
    echo "Пожалуйста, остановите и перезапустите приложение вручную:"
    echo "   npm start"
fi
echo ""

echo "✅ ✅ ✅ Deployment завершен! ✅ ✅ ✅"
echo ""
echo "Вы можете войти в админ панель:"
echo "  Email: admin@citivoice.local"
echo "  Password: admin12345"
