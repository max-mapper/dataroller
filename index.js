var http = require('http')
var stream = require('stream')
var util = require('util')
var shp2json = require('shp2json')
var JSONStream = require('JSONStream')


http.createServer(function (req, res) {
    var start = new Date
    res.setHeader('content-type', "text/csv; charset=utf-8")
    
    var shpStream = shp2json(req)
    var geoJSONParser = JSONStream.parse(['features', /./])
    shpStream.on('error', function (err) {
        res.setHeader('content-type', 'text/plain')
        res.statusCode = 500
        res.end(err + '\n')
    })
    shpStream.on('end', function() {
      console.log((new Date - start) + 'ms')
    })
    var csvStream = new JSONToCSV()
    shpStream.pipe(geoJSONParser).pipe(csvStream).pipe(res)
}).listen(process.argv[2] || 80)

function JSONToCSV() {
  this.headers = []
  this.headersWritten = false
  this.sep = ','
  this.lineSep = '\n'
  this.readable = true
  this.writable = true
  stream.Stream.call(this)
}

util.inherits(JSONToCSV, stream.Stream)

JSONToCSV.prototype.objectToRow = function(obj) {
  var startedOutput = false
  var self = this
  var row = ""
  self.headers.forEach(function(header) {
    var val = obj.properties[header]
    if (val) {
      if (startedOutput) row += self.sep
      if (typeof(val) == "object") val = JSON.stringify(val)
      if (typeof(val) == "string") val = val.replace(/\"/g, '""')
      row += "\"" + val + "\""
    } else {
      if (startedOutput) row += self.sep
    } 
    startedOutput = true
  })
  if (startedOutput) row += self.sep
  row += obj.geometry.type
  startedOutput = true
  row += self.sep
  row += JSON.stringify(obj.geometry)
  row += self.lineSep
  return row
}

JSONToCSV.prototype.objectToHeaderRow = function(obj) {
  this.headers = Object.keys(obj.properties)
  return this.headers.concat(['geometry', 'type']).join(this.sep) + this.lineSep
}

JSONToCSV.prototype.write = function(obj) {
  if (!obj.properties) obj.properties = {}
  if (!this.headersWritten) {
    this.emit('data', this.objectToHeaderRow(obj))
    this.headersWritten = true
  } else {
    this.emit('data', this.objectToRow(obj))
  }
  return true
}

JSONToCSV.prototype.end = function() {
  this.emit('end')
}
