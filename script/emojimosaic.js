// Shhhhh dont tell :(
Element.prototype.hide = function() {
  this.className = "hidden";
}

Element.prototype.show = function() {
  this.className = "";
}

var EmojifyUI = (function() {
  var imageControlsButton = document.getElementById("show_image_controls"),
    videoControlsButton = document.getElementById("show_picture_controls"),
    imageControls = document.getElementById("image_upload"),
    emojifyButton = document.getElementById("emojify"),
    result = document.getElementById("result"),
    videoControls = document.getElementById("video-controls"),
    video = document.getElementById("video"),
    canvas = document.getElementById("canvas"),
    statusDiv = document.getElementById("status"),
    resultControls = document.getElementById("resultControls");
    snap = document.getElementById("snap"),
    ctx = canvas.getContext("2d"),
    emojifyWorker = new Worker("script/emojify-worker.js");

  // Call back for when a file is selected
  var imageSelected = function() {
    console.log("image selected");
    var fileReader = new FileReader();
    fileReader.onload = imageLoaded;

    fileReader.readAsDataURL(document.getElementById("image_upload").files[0]);
  }

  // Callback for when an image is loaded
  var imageLoaded = function(e) {
    console.log("imageLoaded");
    var preview = document.getElementById("preview");

    preview.src = e.target.result;
    imageControls.hide();
    emojifyButton.show();

    // Defer so that proper width and height are obtained.
    setTimeout(function() {
      console.log(preview.width, preview.height);
      canvas.width = preview.width;
      canvas.height = preview.height;
      
      resizeCanvasTo4();

      canvas.show();
      ctx.drawImage(preview, 0, 0);
    }, 0);
  }

  // Passes off image and destination to emojify worker
  var emojify = function(e) {
    document.getElementsByClassName("content")[0].hide();
    statusDiv.show();
    emojifyWorker.postMessage({imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), width: canvas.width, height: canvas.height});
  }

  // Handle worker events!
  emojifyWorker.addEventListener("message", function(messageEvent) {
    if (messageEvent.data.kind === "finished") printResult(messageEvent.data.results, result);
    if (messageEvent.data.kind === "status") updateStatus(messageEvent.data.status);
  });

  // Update loading bar.
  var updateStatus = function(status) {
    if (status < 99) statusDiv.textContent = parseFloat(status).toFixed(0) + "%";
    else statusDiv.textContent = "Finishing up...";
  };

  // Event bindings
  var bindButtons = function() {
    imageControlsButton.addEventListener("click", function(e) {
      imageControls.show();
      e.target.hide();
      videoControlsButton.hide();
    });

    videoControlsButton.addEventListener("click", function(e) {
      videoControls.show();
      video.show();
      startStream();
      e.target.hide();
      imageControlsButton.hide();

      snap.addEventListener('click', function() {
        video.hide();
        canvas.show();
        canvas.width = 640;
        canvas.height = 480;

        e.target.hide();
        emojifyButton.show();


        resizeCanvasTo4();

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      });
    });

    imageControls.addEventListener("change", imageSelected);

    emojifyButton.addEventListener("click", emojify);
  }

  // hack replacing good maths
  var resizeCanvasTo4 = function() {
    while (canvas.width % 4) {
      canvas.width++;
    }

    while (canvas.height % 4) {
      canvas.height++;
    }
  };

  // Start video stream
  var startStream = function() {
    navigator.getMedia = ( navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

    navigator.getMedia ({
      video: true,
      audio: false
    },
    function(stream) {
       if (navigator.mozGetUserMedia) {
          video.mozSrcObject = stream;
        } else {
          var vendorURL = window.URL || window.webkitURL;
          video.src = vendorURL.createObjectURL(stream);
        }
        video.play();
    },
    function(err) {
      console.error("couldnt get video");
    });

  };

  var extractEmoji = function (key) {
    if (key.length > 4) {
      return String.fromCharCode(parseInt(key.substr(0, 4), 16)) + String.fromCharCode(parseInt(key.substr(4), 16));
    } else {
      return String.fromCharCode(parseInt(key.substr(0, 4), 16));
    }
  };

  var printResult = function (emojis, dest) {    
    var val,
        i,
        buf = "";

    dest.show();
    // resultControls.show();

    emojis.forEach(function(val, i) {

      if (!(i % Math.floor(canvas.width/4)) && i) {
        buf += "\n"
      }

      buf += extractEmoji(val);

    });

    dest.textContent = buf;
  };

  return {
    bindButtons: bindButtons
  }
})();

window.onload = function() {
  EmojifyUI.bindButtons();
}