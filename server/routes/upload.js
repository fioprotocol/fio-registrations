const router = require('express').Router();
const handler = require('./handler')
const getMimeType = require('../plugins/upload/mime-type')
const plugins = require('../plugins')

router.get('/upload/*', handler(async (req, res) => {
  const folderAndFile = req.path.substring('/upload/'.length)
  const lastSlash = folderAndFile.lastIndexOf('/')
  const folder = folderAndFile.substring(0, lastSlash)
  const filename = folderAndFile.substring(lastSlash + 1, folderAndFile.length)

  const upload = await plugins.upload
  const read = await upload.read({folder, filename})

  if(!read) {
    return res.status(404).send('Not Found')
  }

  if(read.mimeType) {
    res.set('Content-Type', read.mimeType);
  }
  return res.send(read.data)
}))

module.exports = router
