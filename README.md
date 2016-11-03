# jsonapi-express
Automatically generate jsonapi endpoints from simple schemas

[![Build Status](https://travis-ci.org/jesseditson/jsonapi-express.svg?branch=master)](https://travis-ci.org/jesseditson/jsonapi-express)

## Full Documentation:

[https://jesseditson.github.io/ember-jsonapi/tutorial-modules.html#jsonapi-express](https://jesseditson.github.io/ember-jsonapi/tutorial-modules.html#jsonapi-express)

## Basics:

This module is intended to be called with a schema object, as created by [jsonapi-schema](https://jesseditson.github.io/ember-jsonapi/tutorial-modules.html#jsonapi-schema):

```javascript
var JSONAPI = require('jsonapi-express');
var schema = require('jsonapi-schema');
var path = require('path');
var schemas = schema.loadSchemas(path.join(process.cwd(), 'app'));

var operations = {}; // more on operations below

app.use('/api', JSONAPI(operations, schemas, '/api'));
```

Operations are expected to contain a key per model, with any of the following operations defined:

- `findAll`: a function for finding records
- `findOne`: a function for finding a single record
- `create`:  a function for creating a record
- `update`:  a function for creating a record
- `delete`:  a function for deleting a record
- `updateRelationship`: a function for updating the relationship between two records

If not defined, the operation will be automatically skipped and the request will continue back to your application.

This module then adds the following endpoints for each model. Assuming a model called `article`, this lib would add the following routes:

```
GET    /api/articles        (findAll)
GET    /api/articles/:id    (findOne)
POST   /api/articles        (create)
PATCH  /api/articles/:id    (update)
DELETE /api/articles/:id    (delete)
GET    /api/articles/:id/comments                (findOne or findAll, depending on relationship type)
GET    /api/articles/:id/relationships/comments  (findAll)
POST   /api/articles/:id/relationships/comments  (updateRelationship)
PATCH  /api/articles/:id/relationships/comments  (updateRelationship)
DELETE /api/articles/:id/relationships/comments  (updateRelationship)
```
