import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three'

export interface TextureOptions {
  /** Nearest-neighbour magnification (default true). Turn off for soft gradients. */
  pixelArt?: boolean
  /** Generate mipmaps to avoid shimmer on distant surfaces (default true). Turn off for sprite sheets. */
  mipmaps?: boolean
}

/** Either an image file (e.g. something in `/public`) or a function that paints a canvas at load time. */
export type TextureSource = ({ url: string } | { draw: () => HTMLCanvasElement }) & TextureOptions

/**
 * Character sheet layout: columns are frames (stand, step A, step B), rows are directions (down, left, right, up).
 */
export interface SpriteSheetDefinition {
  texture: TextureSource
  frameWidth: number
  frameHeight: number
}

export interface SpriteSheet {
  texture: Texture
  frameWidth: number
  frameHeight: number
  columns: number
  rows: number
}

export const SPRITE_ROWS = { down: 0, left: 1, right: 2, up: 3 } as const

function configure(texture: Texture, options: TextureOptions): Texture {
  const pixelArt = options.pixelArt ?? true
  const mipmaps = options.mipmaps ?? true
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = pixelArt ? NearestFilter : LinearFilter
  texture.minFilter = mipmaps ? LinearMipmapLinearFilter : pixelArt ? NearestFilter : LinearFilter
  texture.generateMipmaps = mipmaps
  texture.anisotropy = mipmaps ? 8 : 1
  texture.needsUpdate = true
  return texture
}

/** Registry and cache for every texture and sprite sheet the game uses. */
export class AssetManager {
  private readonly sources = new Map<string, TextureSource>()
  private readonly textures = new Map<string, Texture>()
  private readonly sheets = new Map<string, SpriteSheetDefinition>()
  private readonly loader = new TextureLoader()

  registerTexture(id: string, source: TextureSource): void {
    this.sources.set(id, source)
    this.textures.get(id)?.dispose()
    this.textures.delete(id)
  }

  registerSpriteSheet(id: string, def: SpriteSheetDefinition): void {
    this.sheets.set(id, def)
    this.registerTexture(sheetTextureId(id), { mipmaps: false, ...def.texture })
  }

  /**
   * Loads every URL texture and paints every generated one.
   * @param onProgress - called with progress in [0, 1]
   */
  async preload(onProgress?: (progress: number) => void): Promise<void> {
    const pending = [...this.sources].filter(([id]) => !this.textures.has(id))
    let done = 0
    await Promise.all(
      pending.map(async ([id, source]) => {
        const texture = 'url' in source ? await this.loader.loadAsync(source.url) : new CanvasTexture(source.draw())
        this.textures.set(id, configure(texture, source))
        done++
        onProgress?.(done / pending.length)
      }),
    )
  }

  texture(id: string): Texture {
    const cached = this.textures.get(id)
    if (cached) return cached
    const source = this.sources.get(id)
    if (!source) throw new Error(`Unknown texture "${id}"`)
    if ('url' in source) throw new Error(`Texture "${id}" loads from a URL and must be preloaded before use`)
    const texture = configure(new CanvasTexture(source.draw()), source)
    this.textures.set(id, texture)
    return texture
  }

  /**
   * Cached texture for parametric art (e.g. a facade painted for one building's size and colours).
   * @param key - unique key describing every parameter used by `draw`
   * @param draw - paints the canvas
   * @param options - filtering options
   * @returns cached texture
   */
  generated(key: string, draw: () => HTMLCanvasElement, options: TextureOptions = {}): Texture {
    const id = `generated:${key}`
    if (!this.sources.has(id)) this.sources.set(id, { draw, ...options })
    return this.texture(id)
  }

  spriteSheet(id: string): SpriteSheet {
    const def = this.sheets.get(id)
    if (!def) throw new Error(`Unknown sprite sheet "${id}"`)
    const texture = this.texture(sheetTextureId(id))
    const image = texture.image as { width: number; height: number }
    return {
      texture,
      frameWidth: def.frameWidth,
      frameHeight: def.frameHeight,
      columns: Math.round(image.width / def.frameWidth),
      rows: Math.round(image.height / def.frameHeight),
    }
  }

  dispose(): void {
    for (const texture of this.textures.values()) texture.dispose()
    this.textures.clear()
  }
}

function sheetTextureId(id: string): string {
  return `sheet:${id}`
}
