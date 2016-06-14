var express = require('express')
var JSONAPI = require('./lib/JSONAPI')
var bodyParser = require('body-parser')
var pluralize = require('pluralize')

const headers = {
  'Content-Type': 'application/vnd.api+json',
  'Accept': 'application/vnd.api+json'
}

module.exports = function(schemas, operations, baseURL) {
  var router = express.Router()
  router.use(bodyParser.json({ type: 'application/vnd.api+json' }))
  Object.keys(schemas).forEach(name => {
    addRoutes(name, schemas, router, operations, baseURL)
  })
  return router
}

function success(res) {
  res.status(200)
  Object.keys(headers).forEach(h => res.set(h, headers[h]))
  return res
}

function addRoutes(name, schemas, router, operations, baseURL) {
  var toJSONAPI = JSONAPI(schemas, baseURL)
  router.get(`/${name}`, (req, res, next) => {
    operations.findAll(name, '*', { query: req.query, params: {} })
      .then(records => {
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.get(`/${name}/:id`, (req, res, next) => {
    operations.findOne(name, '*', { query: req.query, params: { id: parseInt(req.params.id, 10) } })
      .then(records => {
        success(res).json(toJSONAPI(name)(records.data, {
          included: records.included
        }))
      })
      .catch(next)
  })
  router.post(`/${name}`, (req, res, next) => {

  })
  router.delete(`/${name}`, (req, res, next) => {

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
    router.get(`/${name}/:id/relationships/${k}`, (req, res, next) => {
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
    router.post(`/${name}/:id/relationships/${k}`, (req, res, next) => {

    })
    router.get(`/${name}/:id/${k}`, (req, res, next) => {
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
