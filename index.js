var http = require('http')
var fs = require('fs')
var stream = require('stream')
var util = require('util')
var spawn = require('child_process').spawn
var shp2json = require('shp2json')
var mdb = require('mdb')
var JSONStream = require('JSONStream')
var ecstatic = require('ecstatic')(__dirname + '/attachments')
var tmpFolder = '/tmp/'

var server = http.createServer(function (req, res) {
  if (req.method.toLowerCase() === 'post') handleUpload(req, res)
  else ecstatic(req, res)
}).listen(8080)

function handleUpload(req, res) {
  var start = new Date
  res.setHeader('content-type', "text/csv")
  var ct = req.headers['content-type']
  if (!ct) return sendError(res, "content-type is required")
  ct = ct.toLowerCase()
  if (ct === "application/x-msaccess") return handleAccess(req, res)
  if (ct === "application/zip") return handleShapefile(req, res)
  return sendError(res, "content-type not supported")
}

function zipCSVs(tmpID) {
  var ps = spawn('zip', [ '-r', tmpZip, csvFolder ]);
  ps.on('exit', function (code) {
    next(code < 3 ? null : 'error in unzip: code ' + code)
  })
}

function createCSVs(tmpID) {
  var db = mdb(tmpFolder + tmpID)
  db.tables(function(err, tables) {
    if (err) return console.log(err)
    tables.forEach(function(table) {
      fruit.toCSV(table, function(err, csv) {
        console.log(err, table, csv.split('\n').length - 1 + " lines")
      })
    })
  })
}


function handleAccess(req, res) {
  var id = +new Date() + Math.floor(Math.random() * 999999)
  req.pipe(fs.createWriteStream(tmpFolder + tmp))
    .on('end', function() {
      createCSVs(id, function(err, csvPath) {
        zipFolder(id).pipe(res)
      })
    })
    .on('error', function() {
      resp.end('error', function(err) { sendError(res, err) })
    })
}

function sendError(res, msg) {
  res.setHeader('content-type', 'text/plain')
  res.statusCode = 500
  res.end(msg + '\n')
}

function handleShapefile(req, res) {
  var shpStream = shp2json(req)
  var geoJSONParser = JSONStream.parse(['features', /./])
  shpStream.on('error', function(err) { sendError(res, err) })
  shpStream.on('end', function() {
    console.log((new Date - start) + 'ms')
  })
  var csvStream = new JSONToCSV()
  shpStream.pipe(geoJSONParser).pipe(csvStream).pipe(res)
}

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
