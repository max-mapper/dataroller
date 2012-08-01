var util = require('util')
var stream = require('stream')
var request = require('request')
var filestream = require('domnode-filestream')
var url = require('url')

function dropHandler(e) {
  e.stopPropagation()
  e.preventDefault()
  document.querySelector('.errors').innerHTML = ''
  
  var fileList = e.dataTransfer.files
  var fstream = filestream( fileList, 'binary' )
  var binaryConverter = new FileToBinary()
  fsstream = new FSStream()
  
  var currentURL = url.parse(window.location.href)
  currentURL.pathname = "/upload"
  var uploadURL = url.format(currentURL)
  var upload = request.post(uploadURL)
  bindUploadEvents(upload)
  upload.on('response', function(resp) {
    if (resp.statusCode === 500) {
      outputFile.hasErrors = true
      document.querySelector('.errors').innerHTML = 'error processing shapefile. please drop a valid .zip archive of a shapefile'
    }
  })
  
  var outputFile = new FileSave('shapefile.csv')
  outputFile.on('end', resetUploadState)
  
  fstream.pipe(fsstream).pipe(binaryConverter).pipe(upload).pipe(outputFile)
}

function resetUploadState() {
  document.querySelector('.messages').style.display = 'none'
  document.querySelector('.progress').style.display = 'none'
}

function bindUploadEvents(upload) {
  var progressBar = document.querySelector('.progress')
  upload.on('request', function() {
    monitorProgress(upload)
  })
  upload.on('uploadProgress', function(percent) {
    progressBar.style.display = "block"
    progressBar.value = percent
    progressBar.textContent = percent // xbrowser
  })
  upload.on('uploadComplete', function() {
    document.querySelector('.messages').style.display = 'block'
  })
}

function monitorProgress(upload) {
  upload.req.xhr.upload.onprogress = function(e) {
    emitProgressEvents(upload, e, 'upload')
  }
  upload.req.xhr.onprogress = function(e) {
    emitProgressEvents(upload, e, 'download')
  }
}

function emitProgressEvents(req, xhrProgress, type) {
  var percent = percentage(xhrProgress)
  req.emit(type + 'Progress', percent)
  if (percent === 100) req.emit(type + 'Complete')
}

function percentage(progressEvent) {
  if (progressEvent.lengthComputable) return (progressEvent.loaded / progressEvent.total) * 100
}

document.addEventListener('dragover', function(e){
  e.preventDefault()
  e.stopPropagation()
  document.body.style['border-color'] = 'salmon'
}, false)

document.addEventListener('dragleave', function(e){
  document.body.style['border-color'] = '#ACACAC'
}, false)

document.addEventListener('drop', dropHandler, false)

function FSStream() {
  var me = this
  stream.Stream.call(me)
  me.writable = true
  me.readable = true
  this.loaded = 0
}

util.inherits(FSStream, stream.Stream)

FSStream.prototype.write = function(data) {
  if (data.loaded === this.loaded) return true
  this.emit('data', data.target.result.slice(this.loaded))
  this.loaded = data.loaded
  return true
}

FSStream.prototype.end = function(){
  this.emit('end')
  return true
}

// http://javascript0.org/wiki/Portable_sendAsBinary
function FileToBinary() {
  this.writable = true
  this.readable = true
}

util.inherits(FileToBinary, stream.Stream)

FileToBinary.prototype.write = function(chunk) {
  var ords = Array.prototype.map.call(chunk, this.byteValue)
  var ui8a = new Uint8Array(ords)
  this.emit('data', ui8a.buffer)
}

FileToBinary.prototype.byteValue = function(x) {
  return x.charCodeAt(0) & 0xff
}
 
FileToBinary.prototype.end = function(chunk) { this.emit('end') }

function FileSave(filename) {
  this.filename = filename || 'file'
  this.blobBuilder = new BlobBuilder()
  this.writable = true
  this.hasErrors = false
}

util.inherits(FileSave, stream.Stream)

FileSave.prototype.write = function(chunk) {
  this.blobBuilder.append(chunk)
}

FileSave.prototype.end = function() {
  if (!this.hasErrors) saveAs(this.blobBuilder.getBlob("text/plain;charset=utf-8"), this.filename)
  this.emit('end')
}
