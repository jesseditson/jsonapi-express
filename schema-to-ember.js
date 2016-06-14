import attr from 'ember-data/attr';
import relationships from 'ember-data/relationships'

export default function schemaParser(schema) {
  return Object.keys(schema).reduce((model, key) => {
    var info = schema[key]
    if (typeof info === 'string') {
      model[key] = attr(info)
    } else if (info === null) {
      model[key] = attr()
    } else if (info.relationship) {
      model[key] = relationships[info.type](info.relationship)
    } else {
      model[key] = attr(info.type)
    }
    return model
  }, {})
}
