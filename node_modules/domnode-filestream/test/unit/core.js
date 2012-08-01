// shim BlobBuilder with the vendor specific implementations
window.BlobBuilder = (function(win){
  return win.BlobBuilder       ||
         win.WebKitBlobBuilder ||
         win.MozBlobBuilder    ||
         win.MSBlobBuilder     ||
         false;
})( window );

if( !window.BlobBuilder ) {
  throw new Error("The BlobBuilder API is required to run tests");
}

var file = new window.BlobBuilder();
file.append("hello world");


var ExampleWriteStream = (function(){

  var stream = require('stream');
  var util = require('util');

  function ExampleWriteStream(){
    var me = this;
    stream.Stream.call(me);
    me.writable = true;
  }

  util.inherits(ExampleWriteStream, stream.Stream);

  ExampleWriteStream.prototype.end = function( data ){
    console.log(data);
  };


  return ExampleWriteStream;
})();


module("Core", {

  setup: function(){
    this.blob = file.getBlob();
  }

});

test("FileStreams are totally a thing", function() {
  ok( FileStream );
  ok( new FileStream( this.blob ) );
});

test("and they can process blobs", 5, function(){

  stop();

  var count = 0;

  var fs = new FileStream( this.blob );

  fs.on('data', function( data ){
    if( data.type == "load" ){
      ok( data instanceof ProgressEvent );
      equal( data.currentTarget.result, "hello world" );
    }
    start();
  });

  fs.on('end', function( data ){
    count += 1;
    ok( data instanceof ProgressEvent );
    equal( data.loaded, data.total );
    equal( count, 1, "end should only fire once" );
  });

});

test("piping to a writeable stream", 2, function(){

  stop();

  var wstream = new ExampleWriteStream();

  wstream.write = function( data ){
    if( data.type == "load" ){
      ok( data instanceof ProgressEvent );
      equal( data.currentTarget.result, "hello world" );
    }
    start();
  };

  var fs = new FileStream( this.blob );
  fs.pipe( wstream );

});

test("constructor arguments can be empty, and files can be passed to #read", 2, function(){

  stop();

  var fs = new FileStream();

    fs.on('data', function( data ){
    if( data.type == "load" ){
      ok( data instanceof ProgressEvent );
      equal( data.currentTarget.result, "hello world" );
    }
    start();
  });

  fs.read( this.blob );

});

test("#read", function(){

  var fs = new FileStream( this.blob );

  fs.type = "wuuut";
  raises(function(){
    fs.read( this.blob );
  });

  fs.type = "binary";
  raises(function(){
    fs.read( "foobar" );
  });

});

