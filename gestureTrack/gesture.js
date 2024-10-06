const videoElement = document.getElementById('videoInput');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const gestureOutput = document.getElementById('gestureOutput'); // Get the h5 element

// Load MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 2, // Detecting only one hand at a time for higher precision
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.75
});

// Handle results from the Hands API
hands.onResults(onResults);

// Access webcam
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: '100%',
    // height: 720
});
camera.start();

// Process and draw the results
function onResults(results) {
    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw video frame
    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Draw hand landmarks and classify gestures
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });

            // Classify gesture based on landmarks
            const gesture = classifyGesture(landmarks);
            gestureOutput.innerText = gesture; // Print gesture to the h5 element
        }
    } else {
        gestureOutput.innerText = "No Gesture Detected";
    }

    canvasCtx.restore();
}

// Gesture classification function for 6 common gestures
function classifyGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const thumbIP = landmarks[3]; // Thumb IP joint (3rd landmark in the thumb)
    const wrist = landmarks[0];

    // Calculate distances between key points
    const thumbIndexDistance = getDistance(thumbTip, indexTip);
    const thumbPinkyDistance = getDistance(thumbTip, pinkyTip);
    const thumbMiddleDistance = getDistance(thumbTip, middleTip);
    const wristIndexDistance = getDistance(wrist, indexTip);

    // Thumbs Up Gesture (thumb fully extended upwards)
    if (thumbTip.y < thumbIP.y && wristIndexDistance < 0.25) {
        return "Thumbs Up";
    }

    // Peace Sign Gesture (index and middle fingers extended, others closed)
    if (thumbIndexDistance > 0.3 && thumbMiddleDistance > 0.3 &&
        getDistance(ringTip, pinkyTip) < 0.1) {
        return "Peace Sign";
    }

    // Closed Fist Gesture (all fingers close together)
    if (thumbIndexDistance < 0.05 && thumbMiddleDistance < 0.05) {
        return "Fist";
    }

    // Open Palm Gesture (all fingers extended and spread apart)
    if (thumbIndexDistance > 0.3 && thumbMiddleDistance > 0.3 &&
        thumbPinkyDistance > 0.3) {
        return "Open Palm";
    }

    // Pointing Gesture (index finger extended, other fingers curled)
    if (thumbIndexDistance < 0.2 && getDistance(indexTip, middleTip) > 0.3) {
        return "Pointing";
    }

    // OK Gesture (thumb and index finger form a circle)
    if (thumbIndexDistance < 0.1 && thumbMiddleDistance > 0.2 &&
        thumbPinkyDistance > 0.2) {
        return "OK Sign";
    }

    return "Unknown Gesture";
}

// Helper function to calculate the Euclidean distance between two points
function getDistance(pointA, pointB) {
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;
    return Math.sqrt(dx * dx + dy * dy);
}
