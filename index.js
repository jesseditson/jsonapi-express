var path = require('path')
var express = require('express')
var JSONAPI = require('./lib/JSONAPI')
var loadSchemas = require('./lib/loadSchemas')
var bodyParser = require('body-parser')
var pluralize = require('pluralize')
var debug = require('debug')('jsonapi-express:routes')

const headers = {
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json'
}

module.exports = function(operations, baseURL, rootDir) {
  rootDir = rootDir || path.join(process.cwd(), 'app', 'schemas')
  debug(`Reading schemas from ${rootDir}`)
  baseURL = baseURL || '/'
  debug(`Adding JSONAPI routes at ${baseURL}`)
  var schemas = loadSchemas(rootDir)
  var router = express.Router()
  router.use(bodyParser.json({ type: 'application/vnd.api+json' }))
  if (typeof operations.findAll !== 'function') throw new Error('operations.findAll must be a valid function.')
  if (typeof operations.findOne !== 'function') throw new Error('operations.findOne must be a valid function.')
  if (typeof operations.create !== 'function') throw new Error('operations.create must be a valid function.')
  if (typeof operations.delete !== 'function') throw new Error('operations.delete must be a valid function.')
  if (typeof operations.updateRelationship !== 'function') throw new Error('operations.updateRelationship must be a valid function.')
  Object.keys(schemas).forEach(name => {
    debug(`Adding routes for ${name}`)
    addRoutes(name, schemas, router, operations, baseURL)
  })
  return router
}

function success(res, code) {
  res.status(code || 200)
  Object.keys(headers).forEach(h => res.set(h, headers[h]))
  return res
}

function debugWith(prefix) {
  return function(value) {
    debug(prefix + String(value))
    return value
  }
}

function addRoutes(name, schemas, router, operations, baseURL) {
  var toJSONAPI = JSONAPI(schemas, baseURL)
  var d = debugWith(`Added route: ${baseURL}`)
  router.get(d(`/${name}`), (req, res, next) => {
    operations.findAll(name, '*', { query: req.query, params: {} })
      .then(records => {
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.get(d(`/${name}/:id`), (req, res, next) => {
    operations.findOne(name, '*', { query: req.query, params: { id: parseInt(req.params.id, 10) } })
      .then(records => {
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.post(d(`/${name}`), (req, res, next) => {
    operations.create(name, req.body)
      .then(records => {
        success(res, 201)
          .set('Location', `${baseURL}/${name}/${id}`)
          .json(toJSONAPI(name)(records.data))
      })
      .catch(next)
  })
  router.delete(d(`/${name}/:id`), (req, res, next) => {
    operations.delete(name, req.params.id)
      .then(records => {
        success(res, 204).send()
      })
      .catch(next)
  })
  var schema = schemas[name]
  var relationships = Object.keys(schema).filter(k => schema[k].relationship)
  relationships.forEach(k => {
    var relationship = schema[k]
    var type = relationship.type
    function getOptions(req) {
      var id = parseInt(req.params.id, 10)
      var params = {}
      if (relationship.foreignKey) {
        params[relationship.foreignKey] = id
      } else {
        var idField = relationship.relationship === 'belongsTo' ? 'id' : `${pluralize(name, 1)}_id`
        params[idField] = id
      }
      var opts = { query: req.query, params: params }
      if (relationship.through) {
        opts.through = relationship.through
      }
      return opts
    }
    function normalizeData(data) {
      if (relationship.relationship === 'belongsTo') {
        if (Array.isArray(data)) {
          if (data.length > 1) throw new Error(`findAll for ${name}.${k} returned more than 1 record for a belongsTo relationship.`)
          data = data[0]
        }
      } else if (!Array.isArray(data)) {
        data = [data]
      }
      return data
    }
    router.get(d(`/${name}/:id/relationships/${k}`), (req, res, next) => {
      operations.findAll(relationship.type, ['id'], getOptions(req))
        .then(records => {
          success(res).json(toJSONAPI(relationship.type)(normalizeData(records.data), {
            links: {
              self: `/${name}/${req.params.id}/relationships/${k}`,
              related: `/${name}/${req.params.id}/${k}`
            }
          }, records.defaults ))
        })
        .catch(next)
    })
    function updateRelationship(operation, req, res, next) {
      var record = {
        operation: operation,
        name: name,
        id: req.params.id,
        type: relationship.type
      }
      operations.updateRelationship(relationship.relationship, record, req.body.data)
        .then(response => {
          if (response === null) {
            success(res, 204).send()
          } else {
            success(res).json((normalizeData(response)))
          }
        })
        .catch(next)
    }
    router.post(d(`/${name}/:id/relationships/${k}`), updateRelationship.bind(null, 'create'))
    router.patch(d(`/${name}/:id/relationships/${k}`), updateRelationship.bind(null, 'update'))
    router.delete(d(`/${name}/:id/relationships/${k}`), updateRelationship.bind(null, 'delete'))
    router.get(d(`/${name}/:id/${k}`), (req, res, next) => {
      operations.findAll(relationship.type, '*', getOptions(req))
        .then(records => {
          success(res).json(toJSONAPI(relationship.type)(normalizeData(records.data), {
            links: {
              self: `/${name}/${req.params.id}/${k}`
            },
            included: records.included
          }))
        })
        .catch(next)
    })
  })
}
