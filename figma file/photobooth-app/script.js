document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let capturedPhotos = [];
    let stream = null;
    let selectedColor = 'white';

    // --- Click Sound ---
    const clickSound = new Audio('assets/click.mp3');

    function playClickSound() {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => {
            // Browsers might block auto-play until user interacts
            console.log("Audio play blocked or error:", e);
        });
    }

    // Attach click sound to ALL buttons and clickable elements
    document.addEventListener('click', (e) => {
        if (e.target.closest('button, label.btn, .color-btn, label[for="upload-input"]')) {
            playClickSound();
        }
    });

    // --- DOM Elements ---
    const views = {
        home: document.getElementById('view-home'),
        camera: document.getElementById('view-camera'),
        customize: document.getElementById('view-customize'),
        addNote: document.getElementById('view-add-note'),
        result: document.getElementById('view-result')
    };

    // Buttons
    const btnOpenCamera = document.getElementById('btn-open-camera');
    const uploadInput = document.getElementById('upload-input');
    const btnCapture = document.getElementById('btn-capture');
    const btnNextToNote = document.getElementById('btn-next-to-note');
    const btnFinish = document.getElementById('btn-finish');
    const btnDownload = document.getElementById('btn-download');
    const btnsBackToHome = document.querySelectorAll('.btn-back-home');
    const btnCancel = document.querySelector('.btn-back');

    // Camera UI
    const video = document.getElementById('video-feed');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const flashOverlay = document.getElementById('flash-overlay');
    const cameraStatus = document.getElementById('camera-status');

    // Customization UI
    const stripPreview = document.getElementById('strip-preview');
    const colorPreviewPanel = document.getElementById('color-preview-panel');
    const notePreviewPanel = document.getElementById('note-preview-panel');
    const stripPhotosContainer = document.getElementById('strip-photos');
    const noteInput = document.getElementById('note-input');
    const stripNoteDisplay = document.getElementById('strip-note-display');
    const colorBtns = document.querySelectorAll('.color-btn');

    // Result UI
    const finalStripWrapper = document.getElementById('final-strip-wrapper');

    // --- Navigation ---
    function showView(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[viewName].classList.add('active');

        // Toggle body background for home page
        if (viewName === 'home') {
            document.body.classList.add('home-active');
        } else {
            document.body.classList.remove('home-active');
        }
    }

    function resetApp() {
        capturedPhotos = [];
        selectedColor = 'white';
        noteInput.value = '';
        stripNoteDisplay.textContent = '';
        stripPhotosContainer.innerHTML = '';
        updateStripColor('white');
        colorPreviewPanel.appendChild(stripPreview);
        stopCamera();
        showView('home');
        uploadInput.value = '';
    }

    btnsBackToHome.forEach(btn => btn.addEventListener('click', resetApp));
    btnCancel.addEventListener('click', resetApp);

    // --- Camera Logic ---
    async function startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Camera API is not supported in this browser. Please use localhost or HTTPS, or check browser permissions.");
            return;
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            video.srcObject = stream;
            showView('camera');
            cameraStatus.textContent = "Ready for 3 shots";
            btnCapture.disabled = false;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access the camera. Error: " + (err.message || err.name) + ". Please check permissions.");
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    btnOpenCamera.addEventListener('click', startCamera);

    // Capture sequence
    btnCapture.addEventListener('click', async () => {
        btnCapture.disabled = true;
        capturedPhotos = [];

        for (let i = 0; i < 3; i++) {
            cameraStatus.textContent = `Taking shot ${i + 1} of 3...`;
            await runCountdown(3);
            takePhoto();
            flashScreen();
            await wait(1000); // Wait 1s between shots to show the photo taken
        }

        stopCamera();
        buildStripPreview();
        showView('customize');
    });

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function runCountdown(seconds) {
        countdownOverlay.classList.remove('hidden');
        for (let i = seconds; i > 0; i--) {
            countdownOverlay.textContent = i;
            await wait(1000);
        }
        countdownOverlay.classList.add('hidden');
    }

    function takePhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // Handle mirroring
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL('image/png');
        capturedPhotos.push(dataURL);
    }

    function flashScreen() {
        // The user specifically asked for "a black screen for 3 times" 
        // We simulate a flash but keeping it black.
        flashOverlay.style.background = 'black';
        flashOverlay.classList.remove('hidden');
        flashOverlay.classList.add('active');

        setTimeout(() => {
            flashOverlay.classList.remove('active');
            flashOverlay.classList.add('hidden');
        }, 300);
    }

    // --- Upload Logic ---
    uploadInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).slice(0, 3); // Max 3 photos
        if (files.length === 0) return;

        capturedPhotos = [];
        let loadedPhotos = 0;

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                capturedPhotos[index] = event.target.result;
                loadedPhotos++;

                if (loadedPhotos === files.length) {
                    // Fill remaining slots with the last photo if less than 3
                    while (capturedPhotos.length < 3) {
                        capturedPhotos.push(capturedPhotos[capturedPhotos.length - 1]);
                    }
                    buildStripPreview();
                    showView('customize');
                }
            };
            reader.readAsDataURL(file);
        });
    });

    // --- Customization Logic ---
    function buildStripPreview() {
        stripPhotosContainer.innerHTML = '';
        capturedPhotos.forEach(photoSrc => {
            const img = document.createElement('img');
            img.src = photoSrc;
            img.className = 'strip-photo';
            stripPhotosContainer.appendChild(img);
        });
    }

    function updateStripColor(color) {
        selectedColor = color;
        stripPreview.className = `photostrip bg-${color}`;

        colorBtns.forEach(btn => {
            if (btn.dataset.color === color) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            updateStripColor(btn.dataset.color);
        });
    });

    noteInput.addEventListener('input', (e) => {
        stripNoteDisplay.textContent = e.target.value;
    });

    btnNextToNote.addEventListener('click', () => {
        notePreviewPanel.appendChild(stripPreview);
        showView('addNote');
    });

    // --- Result Logic ---
    btnFinish.addEventListener('click', async () => {
        btnFinish.disabled = true;
        btnFinish.textContent = "Generating...";

        // Clone for display
        finalStripWrapper.innerHTML = '';
        const clonedStrip = stripPreview.cloneNode(true);
        clonedStrip.id = 'final-rendered-strip';
        finalStripWrapper.appendChild(clonedStrip);

        showView('result');
        btnFinish.disabled = false;
        btnFinish.textContent = "Finish & Share";
    });

    // Tap anywhere on the result view to make the note come forward
    views.result.addEventListener('click', (e) => {
        // Don't trigger if a button was clicked
        if (e.target.closest('button')) return;

        const finalNote = document.querySelector('#final-rendered-strip .strip-note');
        if (finalNote && finalNote.textContent.trim() !== '') {
            finalNote.classList.toggle('note-zoomed');
        }
    });

    btnDownload.addEventListener('click', async () => {
        if (!capturedPhotos.length) return;

        try {
            btnDownload.textContent = "Saving...";

            // --- Manual Canvas Rendering (no html2canvas) ---
            const padding = 60;      // padding inside the strip
            const photoGap = 40;     // gap between photos
            const photoWidth = 1000; // width of each photo in px
            const photoHeight = 750; // 4:3 aspect ratio
            const stripWidth = photoWidth + (padding * 2);
            const noteText = document.getElementById('strip-note-display').textContent || '';
            const noteHeight = noteText ? 120 : 0;
            const stripHeight = padding + (photoHeight * 3) + (photoGap * 2) + noteHeight + padding;

            // Determine background color
            let bgColor = '#ffffff';
            const finalStrip = document.getElementById('final-rendered-strip');
            if (finalStrip && finalStrip.classList.contains('bg-pink')) bgColor = '#ffd6e0';
            else if (finalStrip && finalStrip.classList.contains('bg-yellow')) bgColor = '#fff3b0';

            const canvas = document.createElement('canvas');
            canvas.width = stripWidth;
            canvas.height = stripHeight;
            const ctx = canvas.getContext('2d');

            // Draw strip background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, stripWidth, stripHeight);

            // Draw border around strip
            ctx.strokeStyle = '#993B5E';
            ctx.lineWidth = 6;
            ctx.strokeRect(3, 3, stripWidth - 6, stripHeight - 6);

            // Load and draw each photo
            for (let i = 0; i < capturedPhotos.length && i < 3; i++) {
                const img = await loadImage(capturedPhotos[i]);
                const x = padding;
                const y = padding + i * (photoHeight + photoGap);

                // Draw photo (cover-fit)
                const imgRatio = img.width / img.height;
                const targetRatio = photoWidth / photoHeight;
                let sx, sy, sw, sh;

                if (imgRatio > targetRatio) {
                    sh = img.height;
                    sw = sh * targetRatio;
                    sx = (img.width - sw) / 2;
                    sy = 0;
                } else {
                    sw = img.width;
                    sh = sw / targetRatio;
                    sx = 0;
                    sy = (img.height - sh) / 2;
                }

                ctx.drawImage(img, sx, sy, sw, sh, x, y, photoWidth, photoHeight);

                // Draw border around photo
                ctx.strokeStyle = '#993B5E';
                ctx.lineWidth = 6;
                ctx.strokeRect(x, y, photoWidth, photoHeight);
            }

            // Draw note text
            if (noteText) {
                ctx.fillStyle = '#993B5E';
                ctx.font = '72px "Clicker Script", cursive';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const noteY = padding + (photoHeight * 3) + (photoGap * 2) + (noteHeight / 2);
                ctx.fillText(noteText, stripWidth / 2, noteY);
            }

            const link = document.createElement('a');
            link.download = `Photobooth-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            btnDownload.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Saved!`;

            setTimeout(() => {
                btnDownload.innerHTML = `<svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Save Photo`;
            }, 3000);
        } catch (error) {
            console.error("Failed to generate image", error);
            alert("Sorry, something went wrong while saving the image.");
            btnDownload.textContent = "Save Photo";
        }
    });

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
});
