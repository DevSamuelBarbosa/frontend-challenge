const AVATAR_SIZE = 256

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function blobToDataUrl(blob: Blob) {
  if (typeof FileReader !== 'undefined') return readAsDataUrl(blob)
  // Ambientes sem FileReader (Node)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return `data:${blob.type};base64,${btoa(binary)}`
}

/**
 * Converte o avatar em data URL para persistir no armazenamento local. No navegador,
 * a imagem é recortada e reduzida para 256x256 para caber no limite do localStorage.
 */
export async function toAvatarDataUrl(file: File) {
  if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return blobToDataUrl(file)
  }

  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = new OffscreenCanvas(AVATAR_SIZE, AVATAR_SIZE)
  const context = canvas.getContext('2d')
  if (!context) return blobToDataUrl(file)

  // Recorte central quadrado
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )
  bitmap.close()
  return blobToDataUrl(await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 }))
}
