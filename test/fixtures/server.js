var express = require('express')

module.exports = serve

function serve(config) {
  var app = express()
  config(app)
  var server = app.listen(function() {
    var port = server.address().port
    console.log('Example app listening at port %s', port)
  })
  return server
}
