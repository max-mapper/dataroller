var http = require('http')
var fs = require('fs')
var stream = require('stream')
var util = require('util')
var spawn = require('child_process').spawn
var async = require('async')
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
  var ct = req.headers['content-type']
  if (!ct) return sendError(res, "content-type is required")
  ct = ct.toLowerCase()
  if (ct === "application/x-msaccess") return handleAccess(req, res)
  if (ct === "application/zip") return handleShapefile(req, res)
  return sendError(res, "content-type not supported")
}

function zipFolder(folder, res) {
  var out = folder
  var ps = spawn('zip', ['-rj', '-', folder])
  ps.on('exit', function (code) {
    var err = code < 3 ? null : 'error in zip: code ' + code
    if (err) return sendError(res, err)
  })
  return ps.stdout
}

function createCSVs(dbfile, cb) {
  var db = mdb(dbfile)
  db.tables(function(err, tables) {
    if (err) return console.log(err)
    var files = {}
    tables.forEach(function(table) {
      fruit.toCSV(table, function(err, csv) {
        files[table] = csv
        if (Object.keys(files).length === tables.length) cb(false, files)
      })
    })
  })
}

function writeCSVs(folder, json, callback) {
  var writes = Object.keys(json).map(function(key) {
    return function(cb) {
      var error = false
      fs.writeFile(folder + '/' + key, json[key], cb)
    }
  })
  async.parallel(writes, callback)
}

function sanitizeFilename(filename) {
  return filename.replace(/[\\\/:\*\?""'<>|]/ig, "")
}

function handleAccess(req, res) {
  var id = +new Date() + Math.floor(Math.random() * 999999)
  var dbfile = tmpFolder + id + '.db'
  var csvFolder = tmpFolder + id
  var write = fs.createWriteStream(dbfile)
  req.pipe(write)
  write
    .on('close', function() {
      fs.mkdir(csvFolder, function(err) {
        if (err) return sendError(res, err)
        createCSVs(dbfile, function(err, csvs) {
          writeCSVs(csvFolder, csvs, function(err) {
            if (err) return sendError(res, err)
            res.setHeader('content-type', "application/zip")
            zipFolder(csvFolder, res).pipe(res)
          })
        })
      })
    })
    .on('error', function() {
      resp.end('error', function(err) { sendError(res, err) })
    })
}

function sendError(res, msg) {
  res.statusCode = 500
  res.end(msg + '\n')
}

function handleShapefile(req, res) {
  res.setHeader('content-type', "text/csv")
  var start = new Date()
  var shpStream = shp2json(req)
  var geoJSONParser = JSONStream.parse(['features', /./])
  shpStream.on('error', function(err) { sendError(res, err) })
  shpStream.on('end', function() {
    console.log('shapefile', (new Date - start) + 'ms')
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
