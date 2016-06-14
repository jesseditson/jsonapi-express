var path = require('path')
var pluralize = require('pluralize')

module.exports = JSONAPI

function JSONAPI(schemas, baseURL) {
  if (!schemas) throw new Error('You must provide a schema hash when instantiating JSONAPI.')
  return function JSONAPIParser(type) {
    var schema = schemas[type]
    if (!schema) throw new Error(`No schema found for type ${type}.`)
    return function toJSONAPI(obj, info, defaults) {
      info = info || {}
      if (!info.links) info.links = {}
      baseURL = baseURL || ''
      var resp = Object.assign(info, {
        links: Object.assign(info.links, {
          self: path.join(baseURL, info.links.self || type)
        }),
        data: applyTransform(obj, i => {
          var item = toJSONAPIData(type, i, schema, baseURL)
          var relationships = getRelationships(type, item, info.included, schemas, baseURL, defaults)
          if (Object.keys(relationships).length) item.relationships = relationships
          return item
        })
      })
      if (info.links.related) {
        resp.links.related = path.join(baseURL, info.links.related)
      }
      if (resp.included) {
        resp.included = Object.keys(resp.included).map(type => {
          return applyTransform(resp.included[type], i => {
            var item = toJSONAPIData(type, i, schemas[type], baseURL)
            var relationships = getRelationships(type, item, resp.included, schemas, baseURL, defaults)
            if (Object.keys(relationships).length) item.relationships = relationships
            return item
          })
        }).reduce((a, items) => a.concat(items), [])
      }
      return resp
    }
  }
}

function applyTransform(obj, transform) {
  if (Array.isArray(obj)) {
    return obj.map(transform)
  } else {
    return transform(obj)
  }
}

function getRelationships(type, parent, included, schemas, baseURL, defaults) {
  var schema = schemas[type]
  if (!schema) throw new Error(`You included a ${type} object but no schema for it was found.`)
  return Object.keys(schema).reduce((o, p) => {
    var property = schema[p]
    if (property && property.relationship) {
      o[p] = {
        links: {
          self: path.join(baseURL, parent.type, String(parent.id), 'relationships', p),
          related: path.join(baseURL, parent.type, String(parent.id), p)
        }
      }
      if (property.relationship === 'belongsTo') {
        var idKey = property.foreignKey || `${p}_id`
        var attributes = parent.attributes || {}
        if (defaults) {
          for (var d in defaults) {
            if (attributes[d]) attributes[d] = defaults[d]
          }
        }
        var itemId = attributes[idKey]
        if (itemId) o[p].data = toJSONAPIData(property.type, { id: itemId }, null, baseURL, true)
      } else if (property.relationship === 'hasMany' && included && included[property.type]) {
        var type = property.type
        var foreignKey = property.foreignKey || `${pluralize(property.type, 1)}_id`
        if (property.through) {
          var throughSchema = schemas[property.through]
          var throughKey = property.foreignKey || `${pluralize(p, 1)}`
          if (!throughSchema[throughKey]) throw new Error(`${type} specified a ${p} relationship through the ${property.through} table, but the ${property.through} schema does not define a ${throughKey} property.`)
          if (!throughSchema[throughKey].type) throw new Error(`${type} specified a ${p} relationship through the ${property.through} table, but the ${throughKey} property does not define a valid type.`)
          type = throughSchema[throughKey].type
        }
        var items = included[type].filter(i => {
          return i[foreignKey] === parent.id
        })
        o[p].data = applyTransform(items, i => {
          return toJSONAPIData(property.type, { id: i.id }, null, baseURL, true)
        })
      }
    }
    return o
  }, {})
}

function toJSONAPIData(type, obj, schema, baseURL, sparse) {
  if (!obj) throw new Error(`Invalid ${type} object passed to JSONAPI`)
  var resp = {
    type: type,
    id: obj.id
  }
  if (!sparse) {
    resp.links = {
      self: `${baseURL}/${type}/${obj.id}`
    }
    var atts = Object.keys(obj).filter(k => k !== 'id')
    if (atts.length) {
      resp.attributes = atts.reduce((o, k) => {
        o[k] = obj[k]
        return o
      }, {})
    }
  }
  return resp
}
