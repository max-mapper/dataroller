var http = require('http')
var fs = require('fs')
var stream = require('stream')
var util = require('util')
var spawn = require('child_process').spawn
var async = require('async')
var shp2json = require('shp2json')
var shpjson2csv = require('shpjson2csv')
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
      db.toCSV(table, function(err, csv) {
        var filename = sanitizeFilename(table) + '.csv'
        files[filename] = csv
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
  var csvStream = shpjson2csv()
  shpStream.pipe(geoJSONParser).pipe(csvStream).pipe(res)
}

