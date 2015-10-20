// Shhhhh dont tell :(
Element.prototype.hide = function() {
  this.className += " hidden";
};

Element.prototype.show = function() {
  this.className = this.className.replace("hidden", "");
};

var EmojifyUI = (function() {

  var possibleBackgrounds = ["d83dde0d.png", "d83ddeb2.png", "d83ddc7b.png", "d83ddc7d.png", "d83cdf5c.png"];

  var background = document.getElementById("background"),
    video = document.getElementById("video"),
    canvas = document.getElementById("canvas"),
    resultControls = document.getElementById("resultControls");
    snap = document.getElementById("snap"),
    ctx = canvas.getContext("2d"),
    emojifyWorker = new Worker("script/emojify-worker.js"),
    scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer = new THREE.WebGLRenderer(),
    clock = new THREE.Clock(),
    textureLoader = new THREE.TextureLoader(),
    emojiSize = 20,
    in3DMode = false;

  var controls,
    resultURI;

  var geometry = new THREE.PlaneGeometry(1, 1);
  var materialsCache = {};

  renderer.setSize(window.innerWidth, window.innerHeight);
  var ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  function render() {
    var delta = clock.getDelta();
    requestAnimationFrame( render );

    controls.update(delta);
    renderer.render( scene, camera );
  }

  // Call back for when a file is selected
  var imageSelected = function() {
    var fileReader = new FileReader();
    fileReader.onload = imageLoaded;
    fileReader.readAsDataURL(document.getElementById("imageUploadButton").files[0]);
  };

  // Callback for when an image is loaded
  var imageLoaded = function(e) {
    var img = new Image(),
      emojifyButton = document.getElementById("emojifyButton");
    img.src = e.target.result;
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;

      resizeCanvasTo4();

      canvas.show();
      ctx.drawImage(img, 0, 0);
      emojifyButton.addEventListener('click', function() {
        canvas.hide();
        emojify();
      });
      emojifyButton.show();

      removeInitialControls();
    };
  };

  var removeInitialControls = function() {
    var initialControls = Array.prototype.slice.call(document.getElementsByClassName("initialControl"));
    for (var i = 0; i < initialControls.length; i++) {
      initialControls[i].remove();
    }

    document.getElementById("explanation").remove();
  };

  var widthIndex;
  // Passes off image and destination to emojify worker
  var emojify = function() {
    document.getElementsByClassName("content")[0].hide();

    var header = document.getElementById("header");
    var colorOpts = ["#f22", "#f2f", "#22f", "#2ff", "#2f2", "#ff2"];
    var i = 0;
    setInterval(function() {
      header.style.textShadow = "2px 2px " + colorOpts[i];
      i++;
    }, 700);
    emojifyWorker.postMessage({imageData: ctx.getImageData(0, 0, canvas.width, canvas.height), width: canvas.width, height: canvas.height});

    // resize to fit incoming emojis
    widthIndex = canvas.width/4;
    canvas.width = canvas.width/4 * emojiSize;
    canvas.height = canvas.height/4 * emojiSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Handle worker events!
  emojifyWorker.addEventListener("message", function(messageEvent) {
    if (messageEvent.data.kind === "finished") displayResult(messageEvent.data.results);
    if (messageEvent.data.kind === "status") updateStatus(messageEvent.data.status);
  });

  // Update loading bar.
  var updateStatus = function(status) {
    var header = document.getElementById("header");
    if (status < 99) {
      header.textContent = "Processing...";
    } else {
      header.textContent = "Finishing up...";
    }
  };

  // Event bindings
  var bindButtons = function() {
    var takePhotoButton = document.getElementById("takePhotoButton"),
      imageUploadButton = document.getElementById("imageUploadButton"),
      emojifyButton = document.getElementById("emojifyButton"),
      toggle3DButton = document.getElementById("toggle3DButton"),
      saveButton = document.getElementById("saveButton");


    takePhotoButton.addEventListener("click", function(e) {
      video.show();
      startStream();
      removeInitialControls();
      emojifyButton.show();

      emojifyButton.addEventListener("click", function() {
        video.hide();
        canvas.width = 640;
        canvas.height = 480;


        resizeCanvasTo4();

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        emojify();
      });

      saveButton.addEventListener("click", function() {
        download(resultURI, "emojified.png", "image/png");
      });
    });

    imageUploadButton.addEventListener("change", imageSelected);

    toggle3DButton.addEventListener("click", function() {
      var resultImage = document.getElementById("resultImage");
      if (!in3DMode) {
        canvas.show();
        resultImage.hide();
        in3DMode = true;
      } else {
        canvas.hide();
        resultImage.show();
        in3DMode = false;
      }
    });
  };

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

  var textureLoaded = function(position, line) {

    return function(texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      var material;
      if (materialsCache[texture.id]) {
        material = materialsCache[texture.id];
      } else {
        material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        material.transparent = true;
        materialsCache[texture.id] = material;
      }
      var emoji = new THREE.Mesh(geometry, material);

      emoji.position.set(position, line, 1);
      scene.add(emoji);
    };
  };

  var emojiLoaded = function(deferred, context, position, line) {
    return function() {
      context.drawImage(this, position * emojiSize, line * emojiSize, emojiSize, emojiSize);
      deferred.resolve();
    };
  };

  var displayResult = function (emojis) {
    camera.position.z = 10;
    var context = canvas.getContext("2d");
    var val,
        i,
        position = 0,
        line = 0;
    var loaders = [];

    emojis.forEach(function(val, i) {
      if ((i % Math.floor(widthIndex)) === 0 && i) {
        line++;
        position = 0;
      }
      var img = new Image();
      var deferred = Q.defer();
      img.onload = emojiLoaded(deferred, context, position, line);
      img.src = "emoji/" + val + ".png";
      loaders.push(deferred.promise);

      textureLoader.load("emoji/" + val + ".png", textureLoaded(position, line));
      position++;
    });

    Q.allSettled(loaders).then(function() {
      var img = new Image();
      resultURI = canvas.toDataURL("image/png");
      img.src = resultURI;
      img.id = "resultImage";
      document.body.appendChild(img);
      background.remove();
      document.getElementById("header").remove();
      document.getElementById("resultControls").show();
    });

    // while (document.body.firstChild) {
      // document.body.removeChild(document.body.firstChild);
    // }
    // document.body.appendChild(renderer.domElement);

    // controls = new THREE.TrackballControls(camera, renderer.domElement);
    // controls.target.set(0, 0, 0);
    // controls.panSpeed = 0.8;
    // controls.dynamicDampingFactor = 0.3;

    // render();
  };

  var setupBackground = function() {
    background.style.backgroundImage = "url('emoji/" + possibleBackgrounds[Math.floor(Math.random() * possibleBackgrounds.length)] + "')";
  };



  return {
    bindButtons: bindButtons,
    setupBackground: setupBackground
  };
})();

window.onload = function() {
  EmojifyUI.setupBackground();
  EmojifyUI.bindButtons();
};
