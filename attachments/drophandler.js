var util = require('util')
var stream = require('stream')
var request = require('request')
var filestream = require('domnode-filestream')
var url = require('url')

// needed until request browserify gets fixed
XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
  function byteValue(x) {
      return x.charCodeAt(0) & 0xff;
  }
  var ords = Array.prototype.map.call(datastr, byteValue);
  var ui8a = new Uint8Array(ords);
  this.send(ui8a.buffer);
}

function dropHandler(e) {

  e.stopPropagation();
  e.preventDefault();

  var fileList = e.dataTransfer.files

  var fstream = filestream( fileList, 'binary' )
  // var binaryConverter = new FileToBinary()
  fsstream = new FSStream()
  
  var currentURL = url.parse(window.location.href)
  currentURL.pathname = "/upload"
  var uploadURL = url.format(currentURL)
  var outputFile = new FileSave('shapefile.csv')
  fstream.pipe(fsstream).pipe(request.post(uploadURL)).pipe(outputFile)
}

document.addEventListener('dragover', function(e){
  e.preventDefault();
  e.stopPropagation();
}, false);

document.addEventListener('drop', dropHandler, false);

function FSStream() {
  var me = this;
  stream.Stream.call(me);
  me.writable = true;
  me.readable = true;
  this.loaded = 0
}

util.inherits(FSStream, stream.Stream)

FSStream.prototype.write = function(data) {
  if (data.loaded === this.loaded) return true
  this.emit('data', data.target.result.slice(this.loaded))
  this.loaded = data.loaded
  return true
};

FSStream.prototype.end = function(){
  this.emit('end')
  return true
};

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
}

util.inherits(FileSave, stream.Stream)

FileSave.prototype.write = function(chunk) {
  this.blobBuilder.append(chunk)
}

FileSave.prototype.end = function() { 
  saveAs(this.blobBuilder.getBlob("text/plain;charset=utf-8"), this.filename)
}
