# dominode-filestream
A node-style streaming FileReader

As suggested by Max Ogden's
[dominode](https://github.com/maxogden/dominode/), this is a streaming
implementation of the HTML5 [FileReader
API](http://www.w3.org/TR/FileAPI/#FileReader-interface). See the
dominode readme for more details about why this is cool. If you're still
not convinced that streams are awesome, you should
probably [read this, too](http://maxogden.com/node-streams).

For more info on how to read local files in the browser checkout [this article on
HTML5 Rocks](http://www.html5rocks.com/en/tutorials/file/dndfiles/) and
the [MDN FileReader
docs](https://developer.mozilla.org/en/DOM/FileReader).

### Implementation

* all FileReader ProgressEvents events trigger 'data' events
* FileReader error and abort events trigger 'error' on the stream
* FileStreams support piping to Writable Stream
* Support for Blob, File, and FileList objects

### TODO

* <del>'end' events currently aren't ever emitted. This is definitely going
  to be changing in the future, but I'm looking for feedback on the best
  way to do this, and still be able to re-use the same FileStream
  instance multiple times with `FileStream#read`.</del>
* Writable Stream support for the local FileSystem APIs. See more on
  this at [HTML5
  Rocks](http://www.html5rocks.com/en/tutorials/file/filesystem/).

### Example

For a more detailed usage, see `example.js`

    // Pass a FileList or a File object.
    var fstream = new FileStream( file );

    // Pipe it to any writeable stream - data events are fired on all
    // progress and load events from FileReader
    fstream.pipe( writeableStream );

    // Or, just bind a `data` event handler directly to the stream. The
    // handler is passed a FileReader ProgressEvent
    fstream.on('data', function(data){
      console.log(data.loaded);
    });


