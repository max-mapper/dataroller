(function(){

var stream = require('stream');
var util = require('util');

function ExampleWriteStream(){
  var me = this;
  stream.Stream.call(me);
  me.writable = true;
}

util.inherits(ExampleWriteStream, stream.Stream);

ExampleWriteStream.prototype.write = function(data) {
  if( 'load' === data.type ){
    console.log( data.loaded );
  }
};

ExampleWriteStream.prototype.end = function(){
  console.log('end');
};

function dropHandler(e){

  e.stopPropagation();
  e.preventDefault();

  var fileList = e.dataTransfer.files;

  var list = new ExampleWriteStream();
  var fstream = new FileStream( fileList );

  fstream.pipe( list );

}

document.addEventListener('dragover', function(e){
  e.preventDefault();
  e.stopPropagation();
}, false);

document.addEventListener('drop', dropHandler, false);

})();
