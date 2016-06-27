var request = require('supertest')
var test = require('tape')
var router = require('..')
var serve = require('./fixtures/server')
var path = require('path')
var data = require('./fixtures/data')

const schemasDir = path.join(__dirname, 'fixtures', 'schemas')

var operations = {
  findAll(name, attributes, opts) {
    console.log('find', name, attributes, opts)
    return new Promise((resolve, reject) => {
      switch(name) {
        case 'things':
          return resolve(data.allThings)
        case 'stuffs':
          if (opts.params.thing_id && attributes !== '*') return resolve(data.stuffIds)
          return resolve(data.allStuffs)
      }
    })
  }
}
function createServer() {
  return serve(app => {
    app.use('/api', router(operations, '/api', schemasDir))
  })
}
test('GET /api/things', t => {
  var server = createServer()
  request(server)
    .get('/api/things')
    .expect(200)
    .expect('Content-Type', 'application/vnd.api+json; charset=utf-8')
    .expect(res => {
      t.equal(res.body.links.self, '/api/things', 'self link is correct')
      t.equal(res.body.data[0].attributes.name, 'foo', 'data is included')
      var relationships = res.body.data[0].relationships
      t.equal(relationships.stuffs.links.self, '/api/things/1/relationships/stuffs', 'self relationship link is correct')
      t.equal(relationships.stuffs.links.related, '/api/things/1/stuffs', 'related link is correct')
      t.notOk(relationships.stuffs.data[0].attributes, 'attributes are not included on relationship')
      t.ok(relationships.stuffs.data[0].id, 'id is included on relationship')
      t.ok(res.body.included[0], 'included data is sideloaded')
      t.ok(res.body.included[0].attributes, 'included data has attributes')
    })
    .end(e => {
      server.close()
      t.end(e)
    })
})

test('GET /api/things/1/relationships/stuffs', t => {
  var server = createServer()
  request(server)
    .get('/api/things/1/relationships/stuffs')
    .expect(200)
    .expect(res => {
      t.equal(res.body.links.self, '/api/things/1/relationships/stuffs', 'correct self link')
      t.equal(res.body.links.related, '/api/things/1/stuffs', 'correct related link')
      t.notOk(res.body.data[0].attributes, 'does not include attributes')
      t.ok(res.body.data[0].id, 'does include ids')
    })
    .end(e => {
      server.close()
      t.end(e)
    })
})

test('GET /api/things/1/stuffs', t => {
  var server = createServer()
  request(server)
    .get('/api/things/1/stuffs')
    .expect(200)
    .expect(res => {
      t.equal(res.body.links.self, '/api/things/1/stuffs', 'correct self link')
      t.ok(res.body.data[0].attributes, 'includes attributes')
    })
    .end(e => {
      server.close()
      t.end(e)
    })
})
