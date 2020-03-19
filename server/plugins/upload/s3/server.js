const aws = require('aws-sdk');
const s3blobs = require('s3-blob-store')
const getMimeType = require('../mime-type')

const s3config = {}

if(process.env.S3_ACCESS_KEY) {
  s3config.accessKeyId = process.env.S3_ACCESS_KEY
}

if(process.env.S3_SECRET_KEY) {
  s3config.secretAccessKey = process.env.S3_SECRET_KEY
}

if(!process.env.S3_BUCKET) {
  throw new Error('Required: process.env.S3_BUCKET')
}

const s3client = new aws.S3(s3config)

const s3store = s3blobs({client: s3client, bucket: process.env.S3_BUCKET})

/**
  Save and read images from a S3 Bucket
*/
class S3 {
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
  async save({folder, filename, data}) {
    // Only Admin's can upload images, so no need to look at majic file bytes
    const fileMime = getMimeType(filename)
    if(!fileMime) {
      // Make sure the server can re-generate the mime type on request
      throw new Error('Unknown image file name extension')
    }

    const key = `${folder}/${filename}`
    return new Promise(async (resolve, reject) => {
      const stream = s3store.createWriteStream(key, (error, metadata) => {
        if (error) { reject(error) } else { resolve(metadata) }
      })
      stream.write(data)
      stream.end()
    })
  }

  /**
    @plugin required

    @throws {Error} 'filename missing extension'
    @throws {Error} other storage related errors

    @return {object} {data: Buffer, mimeType: String} - or null if file does not exist
  */
  async read({folder, filename}) {
    let mimeType = getMimeType(filename)
    if(!mimeType) {
      throw new Error('Unknown image file name extension')
    }

    const key = `${folder}/${filename}`

    return new Promise(async (resolve, reject) => {
      const file = s3store.createReadStream(key)
      file.on('error', (error) => {
        if (error.notFound || error.code === 'NoSuchKey') {
          resolve(null)
        } else {
          reject(`unable to read ${key}`)
        }
        file.destroy()
      })

      const bufs = []
      file.on('data', function(d) {
        bufs.push(d)
      })

      file.on('end', function() {
        const buf = Buffer.concat(bufs);
        resolve({data: buf, mimeType})
      })
    })
  }
}

module.exports = S3
