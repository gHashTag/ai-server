export type Asset = {
  readonly type: string
  readonly src?: string
  readonly layerName?: string
  readonly composition?: string
  readonly property?: string
  readonly value?: string
}
export type Job = {
  readonly template: {
    readonly src: string
    readonly composition: string
    readonly outputModule: string
    readonly outputExt: string
    readonly settingsTemplate: string
  }
  readonly assets: readonly Asset[]
}

export type TemplateAssets = {
  readonly videos: readonly AssetConfig[]
  readonly images: readonly AssetConfig[]
  readonly audio: readonly AssetConfig[]
  readonly text: readonly TextAssetConfig[]
}

export type TemplateConfig = {
  readonly name: string
  readonly composition: string
  readonly outputModule: string
  readonly outputExt: string
  readonly settingsTemplate: string
  readonly aepPath: string
}

type AssetConfig = {
  readonly layerName: string
  readonly path: string
  readonly composition?: string
}

type TextAssetConfig = {
  readonly layerName: string
  readonly property: string
  readonly defaultValue: string
  readonly composition?: string
}
