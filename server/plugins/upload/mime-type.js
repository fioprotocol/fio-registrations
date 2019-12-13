const mimeTypes = require('./mime-image.json')

function getMimeType(filename) {
  const extIndex = filename.lastIndexOf('.')
  if(extIndex === -1) {
    throw new Error('filename missing extension')
  }

  const ext = filename.substring(extIndex + 1, filename.length)
  return mimeTypes[ext]
}

module.exports = getMimeType
