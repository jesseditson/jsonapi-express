/** @module jsonapi-express/operations */

/**
 * Operations
 *
 * These operations are requested by the JSONAPI routes as necessary to compile data for their endpoints.
 * Each of them returns a Promise, which can be a native JS promise or any spec compatible one.
 *
 * Many of these operations return "data objects", which are shallow objects that will be transformed to JSONAPI compatible documents.
 * These shallow documents should contain all of the fields defined in the corresponding schema, along with an `id` field.
 * If a schema property defines a `belongsTo` relationship, it is expected that the either the document or it's relationship defines a <property>_id key.
 * If a schema property defines a `hasMany` relationship, it is expected that the associated object defines a <property>_id key.
 * hasMany relationships can define `through` relationships, which must be defined as schemas.
 */

/**
 * authorize - authorization middleware
 */
module.exports.authorize = function (req, res, next) {
  next()
}

/**
 * findAll - return an array of objects matching the type and filter, returning only the fields specified.
 *
 * @param  {string} type          The plural name of the schema to fetch
 * @param  {array|string} fields  The fields to return. Either '*' or an array of field names
 * @param  {object} filter        Filtering criteria. Contains a `query` and a `params` object, both of which are POJOs constructed from the API request
 * @return {Promise}              A promise that resolves with an object containing data (and optionally relationships)
 */
module.exports.findAll = function(type, fields, filter) {
  return new Promise((resolve, reject) => {
    // resolve({ data: [], related: [] })
  })
}

/**
 * findOne - return a single object matching the type and filter, returning only the fields specified.
 *
 * @param  {string} type          The plural name of the schema to fetch
 * @param  {array|string} fields  The fields to return. Either '*' or an array of field names
 * @param  {object} filter        Filtering criteria. Contains a `query` and a `params` object, both of which are POJOs constructed from the API request
 * @return {Promise}              A promise that resolves with an object containing data (and optionally relationships)
 */
module.exports.findOne = function(type, fields, filter) {
  return new Promise((resolve, reject) => {
    // resolve({ data: {}, related: [] })
  })
}

/**
 * create - create and return a new record
 * Note that this method is also expected to create relationships if specified, as per the JSONAPI spec.
 * The returned data is expected to be a promise returning the created object
 *
 * @param  {string} type      The type of object to create
 * @param  {object} data      A JSONAPI compatible object, including relationships
 * @return {Promise}          A promise that resolves with an object containing data (and optionally relationships)
 */
module.exports.create = function(type, data) {
  return new Promise((resolve, reject) => {
    // resolve({ data: {}, related: [] })
  })
}

/**
 * update - update an existing record
 *
 * @param  {string} type      The type of object to update
 * @param  {number} id        The id of the object to update
 * @param  {object} data      A JSONAPI compatible update object
 * @return {Promise}          A promise that resolves with an object containing the updated object
 */
module.exports.update = function(type, id, data) {
  return new Promise((resolve, reject) => {
    // resolve({ data: {}, related: [] })
  })
}

/**
 * delete - delete a record of type with the specified id
 *
 * @param  {string} type        The plural name of the schema to delete from
 * @param  {number} id          The ID to delete
 * @return {Promise}            A promise that resolves when the item has been deleted
 */
module.exports.delete = function(type, id) {
  return new Promise((resolve, reject) => {
    // resolve()
  })
}

/**
 * updateRelationship - Update a relationship between two records
 * To properly understand this method, you'll want to familiarize yourself with the appropriate section of the JSONAPI spec:
 * http://jsonapi.org/format/#crud-updating-relationships
 *
 * @param  {string} relationship The type of relationship, either "hasMany" or "belongsTo"
 * @param  {object} record       Record information, containing the following keys:
 *                               {string} operation  The operation to perform (create, update, delete)
 *                               {string} name       The (plural) schema name
 *                               {number} id         The ID of the relationship to update
 *                               {string} type       The type of the relationship schema
 * @param  {object} data         Raw object data from the client to update with (see JSONAPI spec)
 * @return {Promise}             A promise either returning `null` if the relationship(s) already existed (or did not exist), or a relationship object if a relationship was created.
 */
module.exports.updateRelationship = function(relationship, record, data) {
  return new Promise((resolve, reject) => {
    // resolve(null | {})
  })
}
