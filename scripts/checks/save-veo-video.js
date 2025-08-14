#!/usr/bin/env node

/**
 * Скрипт для декодирования и сохранения видео из base64
 */

const fs = require('fs');
const path = require('path');

// Видео закодировано в base64 (7916060 символов)
// Для теста создадим простой декодер

async function saveBase64Video(base64String, outputPath) {
  // Удаляем возможные переносы строк и пробелы
  const cleanBase64 = base64String.replace(/\s/g, '');
  
  // Декодируем base64 в бинарные данные
  const buffer = Buffer.from(cleanBase64, 'base64');
  
  // Сохраняем в файл
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`✅ Видео сохранено: ${outputPath}`);
  console.log(`Размер: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

// Если есть base64 строка из предыдущего теста, можно её сохранить
// Но так как она очень большая (7916060 символов), 
// мы не будем её здесь хранить

console.log(`
📹 Как сохранить видео из Veo:

1. Если вы получили base64 строку:
   - Сохраните её в файл: video_base64.txt
   - Запустите: node scripts/checks/save-veo-video.js decode

2. Если вы использовали storageUri (рекомендуется):
   - Видео уже сохранено в GCS
   - Скачайте: gsutil cp gs://your-bucket/video.mp4 ./

3. Для будущих запросов используйте storageUri:
   {
     "parameters": {
       "storageUri": "gs://veo-videos-neuroblogger/"
     }
   }
`);

// Если передан аргумент 'decode', пытаемся декодировать
if (process.argv[2] === 'decode') {
  const base64File = path.join(__dirname, 'video_base64.txt');
  
  if (fs.existsSync(base64File)) {
    const base64String = fs.readFileSync(base64File, 'utf8');
    const outputPath = path.join(__dirname, '../../output/veo_generated.mp4');
    
    // Создаём директорию если не существует
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    saveBase64Video(base64String, outputPath);
  } else {
    console.log('❌ Файл video_base64.txt не найден');
    console.log('Сохраните base64 строку в этот файл и попробуйте снова');
  }
}
