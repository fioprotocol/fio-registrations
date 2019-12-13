
/**
  Simplify keys returned by a sequelize {raw: true} query. Makes sure no values
  are over-written and gives a way to keep some of string-based nesting (IDs for
  example).

  @example result.map(r => trimKeys(r))
*/
function trimKeys(obj, deepin = ['id']) {
  const keys = Object.keys(obj)
  const ret = {}
  for (var i = 0; i < keys.length; i++) {
    const key = keys[i]
    const keyParts = key.split('.')
    let idx = 1
    let newKey = keyParts[keyParts.length - idx]
    while(
      (
        ret[newKey] ||
        deepin.find(d => newKey === d)
      ) &&
      idx < keyParts.length
    ) {
      idx++
      newKey = keyParts[keyParts.length - idx] + '.' + newKey
    }
    ret[newKey] = obj[key]
  }
  return ret
}

module.exports = {
  trimKeys
}
