var request = require('supertest')
var test = require('tape')
var router = require('..')
var serve = require('./server')

const data = {
  articles: [
    { id: 1, title: 'JSON API paints my bikeshed!', creator_id: 1 }
  ],
  users_articles: [
    { user_id: 1, article_id: 1 },
    { user_id: 2, article_id: 1 }
  ],
  users: [
    { id: 1, name: 'Yehuda Katz' },
    { id: 2, name: 'DHH' },
    { id: 3, name: 'Jesse Ditson' }
  ],
  comments: [
    { id: 1, content: 'first', article_id: 1, user_id: 3 }
  ]
}

const schemas = {
  articles: {
    title: 'string',
    authors: { type: 'users', relationship: 'hasMany', through: 'users_articles' },
    creator: { type: 'users', relationship: 'belongsTo' },
    comments: { type: 'comments', relationship: 'hasMany' }
  },
  users_articles: {
    author: { type: 'users' },
    article: { type: 'articles' }
  },
  users: {
    name: 'string',
    articles: { type: 'articles', relationship: 'hasMany', through: 'users_articles' },
  },
  comments: {
    article: { type: 'articles', relationship: 'belongsTo' },
    user: { type: 'users', relationship: 'belongsTo' },
    content: 'string'
  }
}

test('Without sideloading', t => {
  var server = serve(app => {
    app.use('/api', router(schemas, {
      findAll(name, attributes, opts) {
        console.log('find', name, attributes, opts)
        return new Promise((resolve, reject) => {
          if (name === 'articles') {
            resolve({ data: data.articles })
          } else if (name === 'users') {
            var users = data.users
            if (opts.params.article_id) {
              var joinData = data.users_articles.reduce((o, j) => {
                if (j.article_id == opts.params.article_id) o[j.user_id] = j.article_id
                return o
              }, {})
              if (attributes === '*') {
                users = users.filter(u => !!joinData[u.id])
              } else if (attributes && attributes[0] === 'id' && attributes.length === 1) {
                users = Object.keys(joinData).map(i => {
                  return { id: i }
                })
              }
            } else if (opts.params.id) {
              users = users.filter(u => u.id === opts.params.id)
            }
            resolve({ data: users })
          } else if (name === 'comments') {
            resolve({ data: data.comments })
          } else {
            reject(new Error('Not found'))
          }
        })
      }
    }, '/api'))
  })
  t.test('GET /api/articles', t => {
    request(server)
      .get('/api/articles')
      .expect(res => {
        var article = res.body.data[0]
        t.deepEqual(article.attributes, {
          "title": "JSON API paints my bikeshed!",
          "creator_id": 1
        }, "includes article attributes")
        t.ok(article.relationships, 'includes a relationships key')
        t.equal(article.relationships.authors.links.self, '/api/articles/1/relationships/authors', 'includes authors relationship self link')
        t.equal(article.relationships.authors.links.related, '/api/articles/1/authors', 'includes authors relationship related link')
        t.notOk(article.relationships.authors.data, 'does not include author data')
        t.equal(article.relationships.creator.data.id, 1, 'includes creator data')
        t.ok(article.relationships.comments, 'includes comments relationship key')
      })
      .end(t.end)
  })
  t.test('GET /api/articles/1/relationships/authors (many to many relationship)', t => {
    request(server)
      .get('/api/articles/1/relationships/authors')
      .expect(res => {
        var body = res.body
        t.equal(body.data.length, 2, 'should only return users who are authors')
        t.notOk(body.included, 'should not sideload any data')
        t.notOk(body.data[0].attributes, 'should not include attributes')
        t.ok(body.data[0].relationships.articles.links, 'should include related articles links')
      })
      .end(t.end)
  })
  t.test('GET /api/articles/1/authors (many to many)', t => {
    request(server)
      .get('/api/articles/1/authors')
      .expect(res => {
        var body = res.body
        t.equal(body.data.length, 2, 'should only return users who are authors')
        t.notOk(body.included, 'should not sideload any data')
        t.ok(body.data[0].attributes, 'should include attributes')
        t.ok(body.data[0].relationships.articles.links, 'should include related articles links')
      })
      .end(t.end)
  })
  t.test('GET /api/articles/1/comments (one to many)', t => {
    request(server)
      .get('/api/articles/1/comments')
      .expect(res => {
        var d = res.body.data[0]
        t.ok(d.relationships.article, 'should contain article relationship')
        t.ok(d.relationships.article.data.id, 'should contain article relationship id')
        t.ok(d.relationships.user, 'should contain user relationship')
        t.ok(d.relationships.user.data.id, 'should contain user relationship id')
      })
      .end(t.end)
  })
  t.test('GET /api/articles/1/creator (one to one)', t => {
    request(server)
      .get('/api/articles/1/creator')
      .expect(res => {
        var d = res.body.data
        t.ok(!Array.isArray(d), 'data is not an array')
        t.ok(d.attributes, 'attributes are included')
        t.ok(d.relationships, 'relationships are included')
      })
      .end(t.end)
  })
  server.close()
})

test('With sideloading', t => {
  var server = serve(app => {
    app.use('/api', router(schemas, {
      findOne(name, attributes, opts) {
        return this.findAll(name, attributes, opts).then(u => {
          u.data = u.data[0]
          u.included = { comments: data.comments }
          return u
        })
      },
      findAll(name, attributes, opts) {
        console.log('find', name, attributes, opts)
        return new Promise((resolve, reject) => {
          if (name === 'articles') {
            resolve({ data: data.articles, included: {
              users: data.users,
              comments: data.comments
            }})
          } else if (name === 'users') {
            var users = data.users
            if (opts.params.article_id) {
              var joinData = data.users_articles.reduce((o, j) => {
                if (j.article_id == opts.params.article_id) o[j.user_id] = j.article_id
                return o
              }, {})
              if (attributes === '*') {
                users = users.filter(u => !!joinData[u.id])
              } else if (attributes && attributes[0] === 'id' && attributes.length === 1) {
                users = Object.keys(joinData).map(i => {
                  return { id: i }
                })
              }
            } else if (opts.params.id) {
              users = users.filter(u => u.id === opts.params.id)
            }
            resolve({ data: users })
          } else if (name === 'comments') {
            resolve({ data: data.comments })
          } else {
            reject(new Error('Not found'))
          }
        })
      }
    }, '/api'))
  })
  t.test('GET /api/articles', t => {
    request(server)
      .get('/api/articles')
      .expect(res => {
        var article = res.body.data[0]
        t.deepEqual(article.attributes, {
          "title": "JSON API paints my bikeshed!",
          "creator_id": 1
        }, "includes article attributes")
        t.ok(article.relationships, 'includes a relationships key')
        t.equal(article.relationships.authors.links.self, '/api/articles/1/relationships/authors', 'includes authors relationship self link')
        t.equal(article.relationships.authors.links.related, '/api/articles/1/authors', 'includes authors relationship related link')
        t.ok(article.relationships.authors.data, 'includes author data')
        t.equal(article.relationships.creator.data.id, 1, 'includes creator data')
        t.ok(article.relationships.comments.data, 'includes comment data')
        t.ok(res.body.included.length > 0, 'returns an included key')
      })
      .end(t.end)
  })
  t.test('GET /api/users/3', t => {
    request(server)
      .get('/api/users/3')
      .expect(res => {
        var body = res.body
        t.equal(body.data.attributes.name, 'Jesse Ditson')
        t.ok(body.included.length, 'Should sideload comments')
      })
      .end(t.end)
  })
  server.close()
})
