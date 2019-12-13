
# Update `mime-image.json`

The browser can require a mime type for images.

```javascript
fs = require('fs')
nodeFetch = require('node-fetch')

mimeResult = await nodeFetch(
  'https://raw.githubusercontent.com/jshttp/mime-db/master/db.json'
)

mimeDb = await mimeResult.json()

const mimeTypes = Object.keys(mimeDb).reduce(
  (result, key) => {
    if(key.indexOf('image/') === 0) {
      const typeDef = mimeDb[key]
      if(typeDef.extensions) {
        typeDef.extensions.forEach(ext => {
          result[ext] = key
        })
      }
    }
    return result
  },
  {}
)

const mimeTypesSorted = Object.keys(mimeTypes).sort().reduce((result, key) => {
  result[key] = mimeTypes[key]
  return result
}, {})

fs.writeFileSync('./mime-image.json', JSON.stringify(mimeTypesSorted, null, 2))
```
