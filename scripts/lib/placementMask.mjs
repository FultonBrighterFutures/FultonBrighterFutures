import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

/**
 * Node-side reader for public/assets/map-placement-mask.png, mirroring the
 * browser logic in src/data/mapLayout.js so build-time checks see the same
 * placement rules the scenes apply at runtime.
 */

const WHITE_CHANNEL_MIN = 238
const WORLD_WIDTH = 5.5

function decodeRgbPng(filePath) {
  const png = readFileSync(filePath)
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  const colorType = png[25]

  if (png[24] !== 8 || colorType !== 2) {
    throw new Error('[placement-mask] Expected an 8-bit RGB PNG mask')
  }

  const chunks = []
  let offset = 8
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(chunks))
  const bytesPerPixel = 3
  const stride = width * bytesPerPixel
  const pixels = Buffer.alloc(stride * height)

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const upLeft = x >= bytesPerPixel && y > 0 ? pixels[(y - 1) * stride + x - bytesPerPixel] : 0
      let value = line[x]

      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += (left + up) >> 1
      else if (filter === 4) {
        const predictor = left + up - upLeft
        const dLeft = Math.abs(predictor - left)
        const dUp = Math.abs(predictor - up)
        const dUpLeft = Math.abs(predictor - upLeft)
        value += dLeft <= dUp && dLeft <= dUpLeft ? left : dUp <= dUpLeft ? up : upLeft
      }

      pixels[y * stride + x] = value & 0xff
    }
  }

  return { width, height, stride, bytesPerPixel, pixels }
}

export function loadPlacementMask(filePath) {
  const { width, height, stride, bytesPerPixel, pixels } = decodeRgbPng(filePath)

  const isValidPixel = (px, py) => {
    if (px < 0 || py < 0 || px >= width || py >= height) return false
    const index = py * stride + px * bytesPerPixel
    return !(
      pixels[index] >= WHITE_CHANNEL_MIN &&
      pixels[index + 1] >= WHITE_CHANNEL_MIN &&
      pixels[index + 2] >= WHITE_CHANNEL_MIN
    )
  }

  const contentWidth = width - 1
  const contentHeight = height - 1
  const worldDepth = (WORLD_WIDTH * contentHeight) / contentWidth
  const sceneBounds = {
    xMin: -WORLD_WIDTH / 2,
    xMax: WORLD_WIDTH / 2,
    zMin: -worldDepth / 2,
    zMax: worldDepth / 2,
  }

  const pixelToScene = (px, py) => ({
    x: sceneBounds.xMin + (px / contentWidth) * (sceneBounds.xMax - sceneBounds.xMin),
    z: sceneBounds.zMax - (py / contentHeight) * (sceneBounds.zMax - sceneBounds.zMin),
  })

  /**
   * Resolve a stored marker to the scene position the scenes will actually use,
   * including the snap onto the nearest on-county pixel.
   */
  const resolvePosition = (u, v, maxRadius = 160) => {
    const px = Math.round(u * contentWidth)
    const py = Math.round(v * contentHeight)
    if (isValidPixel(px, py)) return { ...pixelToScene(px, py), snapDistance: 0 }

    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          if (isValidPixel(px + dx, py + dy)) {
            return { ...pixelToScene(px + dx, py + dy), snapDistance: radius }
          }
        }
      }
    }

    return { ...pixelToScene(px, py), snapDistance: Infinity }
  }

  return { resolvePosition }
}

/**
 * A marker disappears when its own orb fits entirely inside a neighbor's.
 * Smallest orb radius is 0.5 × 0.18; largest is 0.5 × 0.5.
 */
export const MIN_VISIBLE_SEPARATION = 0.5 * 0.5 - 0.5 * 0.18
