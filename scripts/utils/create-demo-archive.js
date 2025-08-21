/**
 * Create demo archive for generateScenarioClips results
 * Создание демонстрационного архива с результатами
 */

const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

// Создаем демонстрационные данные
const demoResults = {
  base_photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',
  base_prompt:
    'Epic divine creation story with the mystical number 999, cosmic consciousness awakening, sacred geometry manifestation, digital dharma coding wisdom, transcendent technological enlightenment',
  total_scenes: 4,
  total_variants: 2,
  total_images: 8,
  aspect_ratio: '9:16',
  flux_model: 'black-forest-labs/flux-1.1-pro',
  generation_date: new Date(),
  processing_time: 127.5,
  cost_breakdown: {
    total_stars: 41,
    cost_per_image: 0.055,
    estimated_rubles: 65.6,
  },
}

const demoScenes = [
  {
    scene_id: 1,
    prompt:
      'Divine cosmic awakening with mystical number 999 glowing in sacred geometry, ethereal light',
    variants: [
      {
        variant_id: 1,
        image_url: 'https://demo-images.com/scene1_variant1.jpg',
        generation_time: 28.3,
        status: 'COMPLETED',
      },
      {
        variant_id: 2,
        image_url: 'https://demo-images.com/scene1_variant2.jpg',
        generation_time: 31.7,
        status: 'COMPLETED',
      },
    ],
  },
  {
    scene_id: 2,
    prompt:
      'Sacred geometry manifestation in digital realm, transcendent technological patterns with 999',
    variants: [
      {
        variant_id: 1,
        image_url: 'https://demo-images.com/scene2_variant1.jpg',
        generation_time: 29.1,
        status: 'COMPLETED',
      },
      {
        variant_id: 2,
        image_url: 'https://demo-images.com/scene2_variant2.jpg',
        generation_time: 27.8,
        status: 'COMPLETED',
      },
    ],
  },
  {
    scene_id: 3,
    prompt:
      'Digital dharma coding wisdom flowing through cosmic consciousness networks',
    variants: [
      {
        variant_id: 1,
        image_url: 'https://demo-images.com/scene3_variant1.jpg',
        generation_time: 33.2,
        status: 'COMPLETED',
      },
      {
        variant_id: 2,
        image_url: 'https://demo-images.com/scene3_variant2.jpg',
        generation_time: 30.4,
        status: 'COMPLETED',
      },
    ],
  },
  {
    scene_id: 4,
    prompt:
      'Transcendent technological enlightenment, divine creation with number 999 in cosmic void',
    variants: [
      {
        variant_id: 1,
        image_url: 'https://demo-images.com/scene4_variant1.jpg',
        generation_time: 26.9,
        status: 'COMPLETED',
      },
      {
        variant_id: 2,
        image_url: 'https://demo-images.com/scene4_variant2.jpg',
        generation_time: 32.1,
        status: 'COMPLETED',
      },
    ],
  },
]

// Создаем HTML отчет
function generateHTMLReport() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Отчет генерации сценарных клипов</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .metadata {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 40px;
            border-left: 5px solid #4f46e5;
        }
        
        .metadata h2 {
            color: #4f46e5;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .metadata-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .metadata-item .label {
            font-weight: 600;
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .metadata-item .value {
            color: #1f2937;
            font-size: 1.1rem;
        }
        
        .scenes {
            margin-top: 40px;
        }
        
        .scenes h2 {
            color: #4f46e5;
            margin-bottom: 30px;
            font-size: 1.8rem;
            text-align: center;
        }
        
        .scene {
            background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            border: 2px solid #e5e7eb;
            transition: all 0.3s ease;
        }
        
        .scene:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
        }
        
        .scene-header {
            margin-bottom: 20px;
        }
        
        .scene-title {
            color: #4f46e5;
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .scene-prompt {
            color: #6b7280;
            font-style: italic;
            background: #f1f5f9;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #4f46e5;
        }
        
        .variants {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .variant {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border: 1px solid #e5e7eb;
        }
        
        .variant-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .variant-title {
            font-weight: 600;
            color: #374151;
        }
        
        .status-badge {
            background: #10b981;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .image-placeholder {
            background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%);
            border-radius: 10px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            font-size: 1rem;
            margin-bottom: 15px;
            border: 2px dashed #a78bfa;
        }
        
        .variant-meta {
            display: flex;
            justify-content: space-between;
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .cost-summary {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%);
            border-radius: 15px;
            padding: 30px;
            margin-top: 40px;
            border: 2px solid #3b82f6;
        }
        
        .cost-summary h3 {
            color: #3b82f6;
            margin-bottom: 20px;
            font-size: 1.4rem;
            text-align: center;
        }
        
        .cost-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .cost-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .cost-value {
            font-size: 2rem;
            font-weight: 700;
            color: #3b82f6;
        }
        
        .cost-label {
            color: #6b7280;
            margin-top: 5px;
        }
        
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        
        @media (max-width: 768px) {
            .container {
                border-radius: 0;
                margin: -20px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .content {
                padding: 20px;
            }
            
            .metadata-grid {
                grid-template-columns: 1fr;
            }
            
            .variants {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🎬 Генерация Сценарных Клипов</h1>
            <p class="subtitle">Отчет по созданию визуального контента с ИИ</p>
        </header>
        
        <main class="content">
            <section class="metadata">
                <h2>📊 Метаданные проекта</h2>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <div class="label">Базовый промпт</div>
                        <div class="value">${demoResults.base_prompt.substring(
                          0,
                          80
                        )}...</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Количество сцен</div>
                        <div class="value">${demoResults.total_scenes}</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Вариантов на сцену</div>
                        <div class="value">${demoResults.total_variants}</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Общее количество изображений</div>
                        <div class="value">${demoResults.total_images}</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Соотношение сторон</div>
                        <div class="value">${demoResults.aspect_ratio}</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Модель FLUX</div>
                        <div class="value">${demoResults.flux_model}</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Время обработки</div>
                        <div class="value">${
                          demoResults.processing_time
                        } секунд</div>
                    </div>
                    <div class="metadata-item">
                        <div class="label">Дата генерации</div>
                        <div class="value">${demoResults.generation_date.toLocaleString(
                          'ru-RU'
                        )}</div>
                    </div>
                </div>
            </section>
            
            <section class="scenes">
                <h2>🎭 Сгенерированные сцены</h2>
                
                ${demoScenes
                  .map(
                    scene => `
                <div class="scene">
                    <div class="scene-header">
                        <h3 class="scene-title">Сцена ${scene.scene_id}</h3>
                        <div class="scene-prompt">${scene.prompt}</div>
                    </div>
                    
                    <div class="variants">
                        ${scene.variants
                          .map(
                            variant => `
                        <div class="variant">
                            <div class="variant-header">
                                <span class="variant-title">Вариант ${variant.variant_id}</span>
                                <span class="status-badge">${variant.status}</span>
                            </div>
                            
                            <div class="image-placeholder">
                                🎨 Изображение FLUX<br>
                                ${demoResults.aspect_ratio}
                            </div>
                            
                            <div class="variant-meta">
                                <span>⏱️ ${variant.generation_time}с</span>
                                <span>🔗 <a href="${variant.image_url}" target="_blank">Ссылка</a></span>
                            </div>
                        </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                `
                  )
                  .join('')}
            </section>
            
            <section class="cost-summary">
                <h3>💰 Сводка по стоимости</h3>
                <div class="cost-grid">
                    <div class="cost-item">
                        <div class="cost-value">${
                          demoResults.cost_breakdown.total_stars
                        }</div>
                        <div class="cost-label">Звезд потрачено</div>
                    </div>
                    <div class="cost-item">
                        <div class="cost-value">$${
                          demoResults.cost_breakdown.cost_per_image
                        }</div>
                        <div class="cost-label">За изображение</div>
                    </div>
                    <div class="cost-item">
                        <div class="cost-value">${
                          demoResults.cost_breakdown.estimated_rubles
                        }₽</div>
                        <div class="cost-label">Примерно в рублях</div>
                    </div>
                    <div class="cost-item">
                        <div class="cost-value">${
                          demoResults.total_images
                        }</div>
                        <div class="cost-label">Изображений создано</div>
                    </div>
                </div>
            </section>
        </main>
        
        <footer class="footer">
            <p>🙏 Сгенерировано с помощью AI Server • generateScenarioClips function</p>
            <p>Дата создания: ${new Date().toLocaleString('ru-RU')}</p>
        </footer>
    </div>
</body>
</html>`
}

// Создаем JSON отчет
function generateJSONReport() {
  return JSON.stringify(
    {
      metadata: demoResults,
      scenes: demoScenes,
      generated_at: new Date().toISOString(),
      function_name: 'generateScenarioClips',
      version: '1.0.0',
    },
    null,
    2
  )
}

// Создаем архив
async function createDemoArchive() {
  const outputDir = './output'
  const archiveName = 'scenario_clips_demo_results.zip'
  const archivePath = path.join(outputDir, archiveName)

  // Создаем папку output если не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log('📦 Создаем демонстрационный архив...')

  // Создаем архив
  const output = fs.createWriteStream(archivePath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✅ Демо архив создан: ${archiveName}`)
      console.log(
        `📊 Размер архива: ${Math.round(archive.pointer() / 1024)} KB`
      )
      console.log(`📁 Путь: ${archivePath}`)
      resolve(archivePath)
    })

    archive.on('error', reject)
    archive.pipe(output)

    // Добавляем HTML отчет
    archive.append(generateHTMLReport(), { name: 'scenario_clips_report.html' })

    // Добавляем JSON отчет
    archive.append(generateJSONReport(), { name: 'scenario_clips_data.json' })

    // Добавляем README
    archive.append(
      `# Демонстрационные результаты generateScenarioClips

Этот архив содержит демонстрационные результаты функции generateScenarioClips.

## Содержимое:
- scenario_clips_report.html - HTML отчет с визуализацией
- scenario_clips_data.json - Структурированные данные в JSON
- README.md - Этот файл

## Параметры генерации:
- Базовый промпт: "${demoResults.base_prompt}"
- Сцен: ${demoResults.total_scenes}
- Вариантов на сцену: ${demoResults.total_variants}
- Общее количество изображений: ${demoResults.total_images}
- Модель: ${demoResults.flux_model}
- Стоимость: ${demoResults.cost_breakdown.total_stars} звезд

Дата создания: ${new Date().toLocaleString('ru-RU')}
`,
      { name: 'README.md' }
    )

    archive.finalize()
  })
}

// Запускаем создание демо архива
createDemoArchive()
  .then(archivePath => {
    console.log('\n🎉 Демонстрационный архив готов!')
    console.log('🌐 Откройте файл scenario_clips_report.html в браузере')
    console.log(`📂 Полный путь: ${path.resolve(archivePath)}`)
  })
  .catch(error => {
    console.error('❌ Ошибка создания архива:', error)
  })
