#!/bin/sh
set -e

echo "Регистрирую/обновляю слэш-команды..."
node src/deploy-commands.js

echo "Запускаю бота..."
exec node src/index.js
