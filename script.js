const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const statusText = document.getElementById('status');
const MODEL_URL = './models';
let streamStarted = false;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
  faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
])
.then(() => statusText.textContent = 'Models loaded. Ready to start!')
.catch(err => {
  statusText.textContent = 'Error loading models: ' + err;
});

function toggleWebcam() {
  if (!streamStarted) {
    startVideo();
  } else {
    stopVideo();
  }
}

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
      streamStarted = true;
      video.onloadedmetadata = () => {
        video.play();
        statusText.textContent = 'Detecting emotions…';
        detectLoop();
      };
    })
    .catch(err => {
      statusText.textContent = 'Error accessing webcam: ' + err;
    });
}

function stopVideo() {
  const tracks = video.srcObject.getTracks();
  tracks.forEach(track => track.stop());
  video.srcObject = null;
  streamStarted = false;
  statusText.textContent = 'Webcam stopped.';
}

function updateEmotionList(expressions) {
  for (const emotion in expressions) {
    const el = document.getElementById(emotion);
    if (el) {
      el.textContent = `${(expressions[emotion] * 100).toFixed(0)}%`;
    }
  }
}

async function detectLoop() {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(overlay, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    ).withFaceExpressions();

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    resizedDetections.forEach(det => {
      const { x, y, width, height } = det.detection.box;

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      const expr = Object.entries(det.expressions)
        .reduce((a, b) => (a[1] > b[1] ? a : b));

      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';
      ctx.fillText(`${expr[0]} (${(expr[1] * 100).toFixed(0)}%)`, x + 4, y - 8);

      updateEmotionList(det.expressions);
    });
  }, 100);
}
