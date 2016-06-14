var test = require('tape')

var JSONAPI = require('../../lib/JSONAPI')

const schemas = {
  stuffs: {
    title: 'string',
    count: 'number'
  },
  things: {
    name: 'string',
    test: 'string',
    stuffs: { type: 'stuffs', relationship: 'hasMany' }
  },
  foos: {
    name: 'string',
    bar: { type: 'bars', relationship: 'belongsTo'}
  },
  bars: {
    name: 'string',
    foo: { type: 'foos', relationship: 'belongsTo'}
  }
}

test('calling returns a configurable function', t => {
  t.plan(1)
  var f = JSONAPI(schemas, '/api')
  t.equal(typeof f, 'function', 'returns a function when called')
})

test('calling parser returns a function', t => {
  t.plan(1)
  var f = JSONAPI(schemas, '/api')('things')
  t.equal(typeof f, 'function', 'returns a function when called')
})

test('turns a simple object to a JSONAPI compatible one', t => {
  t.plan(7)
  var f = JSONAPI(schemas, '/api')('things')
  var api = f({ id: 0, test: 'foo' })
  t.ok(api.data, 'contains a data key')
  t.equal(Object.keys(api.data.attributes).length, 1, 'does not add id to attributes')
  t.equal(api.data.attributes.test, 'foo', 'adds attributes')
  t.equal(api.data.id, 0, 'adds the id key')
  t.equal(api.data.type, 'things', 'adds the type key')
  t.ok(api.links, 'adds links')
  t.equal(api.links.self, '/api/things', 'adds self link')
})

test('adds relationships when defined in the schema', t => {
  t.plan(3)
  var f = JSONAPI(schemas, '/api')('things')
  var api = f({
    id: 0,
    test: 'foo'
  })
  t.equal(typeof api.data.relationships, 'object', 'creates a data relationships key')
  t.equal(api.data.relationships.stuffs.links.self, '/api/things/0/relationships/stuffs', 'has a relationship self link')
  t.equal(api.data.relationships.stuffs.links.related, '/api/things/0/stuffs', 'has a relationship related link')
})

test('adds relationships & data when defined in the schema and included', t => {
  t.plan(7)
  var f = JSONAPI(schemas, '/api')('things')
  var api = f({
    id: 0,
    test: 'foo'
  }, {
    included: {
      stuffs: [ { title: 'bar', id: 2, thing_id: 0 } ]
    }
  })
  t.equal(typeof api.data.relationships, 'object', 'creates a data relationships key')
  t.equal(api.data.relationships.stuffs.links.self, '/api/things/0/relationships/stuffs', 'has a relationship self link')
  t.equal(api.data.relationships.stuffs.links.related, '/api/things/0/stuffs', 'has a relationship related link')
  t.deepEqual(api.data.relationships.stuffs.data[0], { id: 2, type: 'stuffs' }, 'creates a relationship entry with only an ID')
  t.equal(api.included[0].id, 2, 'included has id')
  t.equal(api.included[0].type, 'stuffs', 'included has a type')
  t.equal(api.included[0].attributes.title, 'bar', 'included has attributes')
})

test('relationships can be single objects', t => {
  t.plan(5)
  var f = JSONAPI(schemas, '/api')('bars')
  var api = f({
    id: 0,
    test: 'foo',
    foo_id: 2
  }, {
    included: {
      foos: { name: 'bar', id: 2 }
    }
  })
  t.ok(api.data.relationships.foo, 'relationship is defined')
  t.equal(typeof api.data.relationships.foo.links, 'object', 'relationship has links')
  t.notOk(Array.isArray(api.data.relationships.foo), 'relationship is not an array')
  t.ok(api.data.relationships.foo.data.id, 'relationship data is included')
  t.notOk(api.data.relationships.foo.data.attributes, 'attributes are not included in the relationship data')
})
