var path = require('path')
var express = require('express')
var JSONAPI = require('jsonapi-schema')
var bodyParser = require('body-parser')
var pluralize = require('pluralize')
var debug = require('debug')('jsonapi-express:routes')
var debugOp = require('debug')('jsonapi-express:operations');

const headers = {
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json'
}

module.exports = function(operations, schemas, baseURL) {
  baseURL = baseURL || '/'
  debug(`Adding JSONAPI routes at ${baseURL}`)
  var router = express.Router()
  router.use(bodyParser.json({ type: 'application/vnd.api+json' }))
  if (operations.authorize) router.use(operations.authorize)
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

function normalizeRecords(records) {
  if (!records) return records
  if (!records.data) return { data: records }
  return records
}

function getTransform(transforms) {
  transforms = transforms || {}
  return function(type, args) {
    var transform = transforms[type]
    return function(memo) {
      if (transform) return transform(memo, ...args)
      return memo
    }
  }
}

function getOperations(ops, name) {
  return function operations(op, type) {
    // look up this operation on the operation[model] hash (if it exists)
    var operation = ops[name] && ops[name][op]
    if (operation) debugOp('using ' + name + '.' + op + ' operation')
    // fall back to a global handler for this type of operation (if available, useful for ORM-like implementations)
    if (!operation && ops[op]) {
      var t = type || name
      operation = ops[op].bind(null, t)
      debugOp('using base ' + op + ' operation with type ' + t)
    }
    // if no operation is provided, call next whenever this operation is called (which will give the opportunity to handle back to the containing express app)
    if (!operation) {
      operation = function() {
        var opts = Array.prototype.slice.call(arguments).slice(-1)[0]
        opts.next()
      }
      debugOp(op + ' ' + name + ' operation not found, skipping')
    }
    return operation
  }
}

function addRoutes(name, schemas, router, operations, baseURL) {
  var transform = getTransform(operations.transforms)
  var operation = getOperations(operations, name)
  function transformIncluded(req) {
    return function(records) {
      if (!records || !records.included) return records
      var includedTypes = Object.keys(records.included)
      return Promise.all(includedTypes.map(type => {
        return transform(type, [req])(records.included[type])
      })).then(included => {
        records.included = includedTypes.reduce((o, type, idx) => {
          o[type] = included[idx]
          return o
        }, {})
        return records
      })
    }
  }
  var toJSONAPI = JSONAPI(schemas, baseURL)
  var d = debugWith(`Added route: ${baseURL}`)
  router.get(d(`/${name}`), (req, res, next) => {
    operation('findAll')('*', {
        query: req.query,
        params: {}
      }, {
        req: req,
        res: res,
        next: next
      })
      .then(transform(name, [req]))
      .then(normalizeRecords)
      .then(transformIncluded(req))
      .then(records => {
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.get(d(`/${name}/:id`), (req, res, next) => {
    operation('findOne')('*', {
        query: req.query,
        params: { id: parseInt(req.params.id, 10) }
      }, {
        req: req,
        res: res,
        next: next
      })
      .then(transform(name, [req]))
      .then(normalizeRecords)
      .then(transformIncluded(req))
      .then(records => {
        records = records || {}
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.post(d(`/${name}`), (req, res, next) => {
    operation('create')(req.body, {
        req: req,
        res: res,
        next: next
      })
      .then(created => {
        if (!created) {
          throw new Error('You must return a model or ID from the "created" operation')
        } else if (typeof created !== 'object') {
          return operation('findOne')('*', {
            query: req.query,
            params: { id: created }
          }, {
            req: req,
            res: res,
            next: next
          })
        } else {
          return created
        }
      })
      .then(transform(name, [req]))
      .then(normalizeRecords)
      .then(transformIncluded(req))
      .then(records => {
        records = records || {}
        success(res, 201)
          .set('Location', `${baseURL}/${name}/${records.id}`)
          .json(toJSONAPI(name)(records.data, {
            included: records.included
          }))
      })
      .catch(next)
  })
  router.patch(d(`/${name}/:id`), (req, res, next) => {
    operation('update')(req.params.id, req.body, {
        req: req,
        res: res,
        next: next
      })
      .then(transform(name, [req]))
      .then(normalizeRecords)
      .then(transformIncluded(req))
      .then(records => {
        records = records || {}
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.delete(d(`/${name}/:id`), (req, res, next) => {
    operation('delete')(req.params.id, {
        req: req,
        res: res,
        next: next
      })
      .then(records => {
        success(res, 204).send()
      })
      .catch(next)
  })
  var schema = schemas[name]
  var relationships = Object.keys(schema).filter(k => schema[k] && schema[k].relationship)
  relationships.forEach(k => {
    var relationship = schema[k]
    var type = relationship.type
    function getOptions(req) {
      var id = parseInt(req.params.id, 10)
      var filter = {
        params: {},
        query: req.query
      }
      if (relationship.relationship === 'belongsTo') {
        // TODO: verify that this works in both directions
        var idKey = relationship.foreignKey || `${k}_id`
        filter.join = {
          fields: `${type}.*`,
          table: `${name}`,
          left: `${name}.${idKey}`,
          right: `${type}.id`
        }
        filter.params[`${name}.id`] = id
      } else if (relationship.relationship === 'hasMany') {
        var idKey = relationship.foreignKey || `${pluralize(name, 1)}_id`
        filter.params[idKey] = id
      }
      if (relationship.through) {
        filter.through = relationship.through
      }
      return filter
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
    router.get(d(`/${name}/:id/${k}`), (req, res, next) => {
      var operationType = relationship.relationship === 'belongsTo' ? 'findOne' : 'findAll'
      operation(operationType, relationship.type)('*', getOptions(req), {
          req: req,
          res: res,
          next: next
        })
        .then(transform(k, [req]))
        .then(normalizeRecords)
        .then(transformIncluded(req))
        .then(records => {
          records = records || {}
          success(res).json(toJSONAPI(relationship.type)(normalizeData(records.data), {
            links: {
              self: `/${name}/${req.params.id}/${k}`
            },
            included: records.included
          }))
        })
        .catch(next)
    })
    router.get(d(`/${name}/:id/relationships/${k}`), (req, res, next) => {
      operation('findAll', relationship.type)(['id'], getOptions(req), {
          req: req,
          res: res,
          next: next
        })
        .then(transform(k, [req]))
        .then(normalizeRecords)
        .then(records => {
          records = records || {}
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
      operation('updateRelationship')(relationship.relationship, record, req.body.data, {
          req: req,
          res: res,
          next: next
        })
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
  })
}
