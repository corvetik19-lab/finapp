# PWA Иконки

Разместите иконки приложения в этой папке.

## Требуемые размеры:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Быстрое создание:

### Вариант 1: Онлайн генератор
1. Перейдите на https://realfavicongenerator.net/
2. Загрузите ваш логотип (минимум 512x512px)
3. Скачайте все размеры
4. Поместите в эту папку

### Вариант 2: Используйте логотип финансового приложения
Создайте простую иконку с символом 💰 или 📊 на синем фоне (#4F46E5)

### Вариант 3: ImageMagick (если установлен)
```bash
# Если у вас есть один файл logo.png (512x512)
convert logo.png -resize 72x72 icon-72x72.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 192x192.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 512x512 icon-512x512.png
```

## Временное решение:

Пока иконок нет, приложение будет работать, но кнопка "Установить" может не появиться.
После добавления иконок перезагрузите приложение.
