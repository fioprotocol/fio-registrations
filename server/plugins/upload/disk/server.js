const fs = require('fs')
const path = require('path')

const getMimeType = require('../mime-type')

if ( ! process.env.UPLOAD_DISK_FOLDER) {
  throw new Error('Required: process.env.UPLOAD_DISK_FOLDER')
}

if( ! fs.existsSync(process.env.UPLOAD_DISK_FOLDER)) {
  fs.mkdirSync(process.env.UPLOAD_DISK_FOLDER)
}

/**
  Save and read images to disk

  Requires writable folder: process.env.UPLOAD_DISK_FOLDER
*/
class DiskUpload {
  constructor({debug}) {
    this.debug = debug
  }

  /**
    @plugin required

    @arg {object} object.folder - folder or storage namespace (forward slashes)
    @arg {object} object.filename - with mappable mime type extension
    @arg {object} object.type - mime type, set from filename extention if omitted
    @arg {object} object.data - image content <string> | <Buffer> | <TypedArray> | <DataView>

    @throws {Error} 'unknown file mime type'
    @throws {Error} other storage related errors
  */
  async save({folder, filename, mimeType, data}) {
    let folderPath = path.join(process.env.UPLOAD_DISK_FOLDER, 'upload')

    let incrPath = ''
    path.join(folderPath, folder).split('/').forEach(dir => {
      incrPath = path.join(incrPath, dir)
      if( ! fs.existsSync(incrPath)) {
        fs.mkdirSync(incrPath)
      }
    })
    folderPath = incrPath

    const imagePath = path.join(folderPath, filename)

    // Make sure the server can re-generate the mime type on request
    const fileMime = getMimeType(filename)
    if(!fileMime && mimeType) {
      fs.writeFileSync(imagePath + '.json', JSON.stringify({mimeType}))
    }

    if(!fileMime && !mimeType) {
      throw new Error('unknown file mime type')
    }

    fs.writeFileSync(imagePath, data)
  }

  /**
    @plugin required

    @throws {Error} 'filename missing extension'
    @throws {Error} other storage related errors

    @return {object} {data: Buffer, mimeType: String} - or null if file does not exist
  */
  async read({folder, filename}) {
    const imagePath = path.join(process.env.UPLOAD_DISK_FOLDER, 'upload', folder, filename)

    if(!fs.existsSync(imagePath)) {
      return null
    }

    let mimeType = getMimeType(filename)
    if(!mimeType) {
      const metadata = JSON.parse(fs.readFileSync(imagePath + '.json'))
      mimeType = metadata.mimeType
    }

    const data = fs.readFileSync(imagePath)
    return {data, mimeType}
  }
}

module.exports = DiskUpload
