import { join } from 'path'
import { CONFIG } from '@/config'
import { TemplateAssets, TemplateConfig } from '@/interfaces'

const TEMPLATE_NAME = 'riddle'

const TEMPLATE_CONFIG = {
  name: TEMPLATE_NAME,
  composition: 'Instagram_Story',
  paths: {
    template: join(
      CONFIG.paths.base,
      'src',
      CONFIG.paths.templates,
      TEMPLATE_NAME
    ),
    assets: 'Assets',
  },
}

export const config: TemplateConfig = {
  name: TEMPLATE_CONFIG.name,
  composition: TEMPLATE_CONFIG.composition,
  outputModule: 'H.264 - Match Render Settings - 15 Mbps',
  outputExt: 'mp4',
  settingsTemplate: 'Best Settings',
  aepPath: join(TEMPLATE_CONFIG.paths.template, `${TEMPLATE_NAME}.aep`),
}

const assetsDir = join(
  TEMPLATE_CONFIG.paths.template,
  TEMPLATE_CONFIG.paths.assets
)

export const assets: TemplateAssets = {
  videos: [
    {
      layerName: 'Video_01',
      path: join(assetsDir, 'sourceVideoPath.mp4'),
    },
    {
      layerName: 'BG_01',
      path: join(assetsDir, 'bg-video01.mp4'),
    },
    {
      layerName: 'BG_02',
      path: join(assetsDir, 'bg-video02.mp4'),
    },
    {
      layerName: 'BG_03',
      path: join(assetsDir, 'bg-video03.mp4'),
    },
    {
      layerName: 'BG_04',
      path: join(assetsDir, 'bg-video04.mp4'),
    },
  ],
  images: [
    {
      layerName: 'Photo_01',
      path: join(assetsDir, 'cover01.png'),
      composition: 'Instagram_Story',
    },
  ],
  audio: [
    {
      layerName: 'Audio_01',
      path: join(assetsDir, 'news.mp3'),
    },
  ],
  text: [
    {
      layerName: 'Text_02',
      property: 'Source Text',
      defaultValue: 'GEMINI 2.0',
      composition: 'Text_02',
    },
  ],
}
