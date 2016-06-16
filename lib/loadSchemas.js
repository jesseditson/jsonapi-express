var path = require('path')
var fs = require('fs')
var pluralize = require('pluralize')

module.exports = function loadSchemas(schemasFolder) {
  var schemaFiles = fs.readdirSync(schemasFolder)

  var schemas = {};
  for (var k in schemaFiles) {
    var file = schemaFiles[k]
    if (!/\.json$/.test(file)) {
      console.warn(`Found a non-json file ${file} in the schemas directory.`)
      break
    }
    var name = path.basename(file, '.json')
    var o
    try {
      o = JSON.parse(fs.readFileSync(path.join(schemasFolder, file)))
    } catch (e) {
      console.error(`Failed parsing ${name} schema:`)
      throw e
    }
    schemas[pluralize(name)] = o
  }
  return schemas
}
