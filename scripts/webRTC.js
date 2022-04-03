//  Get available WebRTC devices for the settings panel
function getDevices() {

    return new Promise((resolve, reject) =>
        navigator.mediaDevices.enumerateDevices()
            .then(result => {

                listCams.options.length = 0;
                listMics.options.length = 0;
                listOuts.options.length = 0;

                result.forEach(x => {
                    switch (x.kind) {
                        case 'videoinput':
                            listCams.add(new Option(x.label, x.deviceId));
                            break;
                        case 'audioinput':
                            listMics.add(new Option(x.label, x.deviceId));
                            break;
                        case 'audiooutput':
                            listOuts.add(new Option(x.label, x.deviceId));
                            break;
                    }
                });

                resolve(true);
            })
            .catch(() => reject(new Error('It seems that you don\'t have available input devices, such as a camera or a microphone!')))
    );
}

//  Starts the camera, and the update loop
async function startCamera() {

    const videoSize = appSettings.video.resolution.split('x');

    //  Initialize camera stream
    const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: videoSize[0],
            height: videoSize[1],
            deviceId: appSettings.video.videoInputDevice,
        },
        audio: {
            deviceId: appSettings.video.audioInputDevice,
            autoGainControl: false,
            channelCount: 2,
            echoCancellation: true,
            latency: 0,
            noiseSuppression: false,
            sampleRate: 48000,
            sampleSize: 16,
            volume: 1.0
        }
    })
        .catch(err => console.error(err.message));

    if (!cameraStream) {
        alert('Failed to activate the selected video input device.\nPlease review configuration settings!');
        return;
    }

    cameraVideo.width = videoSize[0];
    cameraVideo.height = videoSize[1];
    cameraVideo.srcObject = cameraStream;
    cameraVideo.muted = false;
    cameraVideo.autoplay = true;
    cameraVideo.volume = 0;

    overlayVideo.width = videoSize[0];
    overlayVideo.height = videoSize[1];

    //  Audio device selection
    await cameraVideo.setSinkId(appSettings.video.audioOutputDevice)
        .catch(err => {
            alert('Failed to initialize the selected audio input device.\nPlease review configuration settings!')
        });

    /*
    //  Audio output device selection for a later time, when WebRTC standard is properly implemented
    navigator.mediaDevices.selectAudioOutput({
        deviceId: appSettings.video.audioInputDevice
    })
        .then(device => console.log(device))
        .catch(err => console.log(err));
    */

    //  Display resolution info
    const resolutionInfo = `${appSettings.video.resolution}, ${appSettings.video.videoBitrate}/${appSettings.video.audioBitrate} bps`;
    document.getElementById('record_resolution').innerHTML = resolutionInfo;

    //  Configure overlay canvas  -------------------------------------------------------------------------------------------------

    videoCanvas.width = videoSize[0];
    videoCanvas.height = videoSize[1];

    drawing.canvas.width = videoSize[0];
    drawing.canvas.height = videoSize[1];

    const ctx = videoCanvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;

    //  Camera loop: refresh the canvas every 30 seconds
    const cameraLoop = () => {

        //  Camera feed, only add if there's no video or image being shown
        if (!overlayImage || overlayImage.width < videoCanvas.width || overlayImage.height < videoCanvas.height ||
            !overlayVideo.showing || overlayVideo.width < videoCanvas.width || overlayVideo.height < videoCanvas.height) {
            ctx.fillStyle = "rgba(0, 0, 0, .8)";
            ctx.drawImage(cameraVideo, 0, 0, cameraVideo.videoWidth, cameraVideo.videoHeight);
        }

        //  Black background
        if (
            (!!overlayImage || (!!overlayVideo && overlayVideo.showing && overlayVideo.currentTime > 0)) &&
            !!currentOverlayAsset &&
            currentOverlayAsset.black
        )
            ctx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);

        //  Border around asset
        if (!!currentOverlayAsset && currentOverlayAsset.border !== 'none' && !!currentResizeData) {
            ctx.fillStyle = currentOverlayAsset.border;
            ctx.fillRect(
                currentResizeData.x - 5,
                currentResizeData.y - 5,
                currentResizeData.width + 10,
                currentResizeData.height + 10
            );
        }

        //  Superimpose video
        if (overlayVideo.showing && overlayVideo.currentTime > 0 && !!currentResizeData) {
            ctx.drawImage(
                overlayVideo,
                currentResizeData.x,
                currentResizeData.y,
                currentResizeData.width,
                currentResizeData.height
            )
        }

        //  Superimpose image
        if (!!overlayImage && !!currentResizeData) {
            ctx.drawImage(
                overlayImage,
                currentResizeData.x,
                currentResizeData.y,
                currentResizeData.width,
                currentResizeData.height
            );
        }

        //  Superimpose text
        if (!!overlayCanvas && !!currentResizeData)
            ctx.drawImage(
                overlayCanvas,
                0,
                0,
                currentResizeData.width,
                currentResizeData.height,
                currentResizeData.horizontalCenter ? (videoCanvas.width / 2 - currentResizeData.width / 2) : currentResizeData.x,
                currentResizeData.verticalCenter ? (videoCanvas.height / 2 - currentResizeData.height / 2) : currentResizeData.y,
                currentResizeData.width,
                currentResizeData.height
            );

        //  Superimpose drawing canvas
        if (drawing.active) {
            ctx.drawImage(
                drawing.canvas,
                0,
                0,
                videoCanvas.width,
                videoCanvas.height,
                0,
                0,
                videoCanvas.width,
                videoCanvas.height
            );
        }

        //  Preview arrow being drawn
        if (drawing.arrow.active && drawing.arrow.x > 0 && drawing.arrow.y > 0) {
            ctx.strokeStyle = drawing.ctx.strokeStyle;
            ctx.lineWidth = drawing.ctx.lineWidth;

            ctx.beginPath();
            ctx.setLineDash = ([5, 10]);
            ctx.moveTo(drawing.arrow.x, drawing.arrow.y);
            ctx.lineTo(drawing.x, drawing.y);
            ctx.stroke();
            ctx.closePath();
        }

        //  Preview text being drawn
        if (drawing.text) {
            ctx.fillStyle = drawing.ctx.fillStyle;
            ctx.font = `${document.getElementById('drawing-text-font-size').value}px ${document.getElementById('drawing-text-font').value}`;
            ctx.fillText(drawing.text, drawing.x, drawing.y + 15);
        }

        setTimeout(cameraLoop, (1000 / 30));
    };

    cameraLoop();

    const videoStream = videoCanvas.captureStream(30);

    //  Add microphone audio stream to canvas stream
    const audioTracks = cameraVideo.srcObject.getAudioTracks();
    if (!audioTracks.length)
        alert('No audio input device seems to be configured.\nPlease review your application configuration!\nStarting a recording now would result in no microphone audio recorded.')
    else
        videoStream.addTrack(cameraVideo.srcObject.getAudioTracks()[0]);

    //  Initialize MediaSwitcher ----------------------------------------------------------------------------------------------------

    mediaSwitcher = new MediaSwitcher();
    const mainStream = await mediaSwitcher.initialize(videoStream)
        .catch(err => alert('Unable to initialize MediaSwitcher.'));
    if (!mainStream) return;

    videoMonitor.width = videoSize[0];
    videoMonitor.height = videoSize[1];
    videoMonitor.srcObject = mainStream;

    //  Set up recorder ----------------------------------------------------------------------------------------------------

    //  Main recorder - records canvas video and microphone
    try {
        mainRecorder = new MediaRecorder(mainStream, { mimeType: appSettings.video.codec })
    } catch (err) {
        alert(`Failed to initialize recorder: ${appSettings.video.codec} is not supported by this device. Please select a different codec!`);
        return;
    }

    mainRecorder.audioBitsPerSecond = appSettings.video.audioBitrate;
    mainRecorder.videoBitsPerSecond = appSettings.video.videoBitrate;

    mainRecorder.ondataavailable = e => {
        if (mainRecorder.state !== 'recording' || !e.data)
            return;

        mainRecorderChunks.push(e.data);
        recordingSize += e.data.size;
        document.getElementById('record_size').innerHTML = prettifyBytes(recordingSize);
    }

}

//  Starts recording
async function startRecording() {

    if (!mainRecorder) {
        alert('Unable to start recording now. Please wait until input devices properly initialize, or if they don\'t, review your configuration settings!');
        return;
    }

    //  If already recording - stop!
    //  0.5 second delay or it would lose the last frames
    if (mainRecorder.state !== 'inactive') {
        setTimeout(() => {
            mainRecorder.stop();
            saveVideoFile();
        }, 500);
        return;
    }

    //  Before starting recording, verify if all assets are in place
    const missingAssets = await electron.verifyAssets(videoAssets);
    if (missingAssets.length > 0 && !confirm(`Some asset files are missing and you won't be able to display them:

${ missingAssets.slice(0, 12).map(asset => '- ' + asset.name).join('\n')}
${ missingAssets.length > 12 ? `\nThere's ${missingAssets.length - 12} more.\n` : ''}
Do you want to start recording without them?`)) return;

    //  Start recording timer
    recordingSize = 0;
    recordTime = 0;
    document.getElementById('record_size').innerHTML = '0 B';
    recordTimer.innerHTML = '00:00:00';

    recordInterval = setInterval(() => {
        recordTime++;
        recordTimer.innerHTML = secondsToTime(recordTime);

        if (mainRecorder.state !== 'inactive')
            mainRecorder.requestData();
    }, 1000);

    //  Reset recording buffer
    mainRecorderChunks.length = 0;
    recButton.classList.add('recording');

    //  Staaaaaart!
    mainRecorder.start();
}

//  Cleanup function when saving is finished
//  Called by saveVideoFile
function finishSaveVideo() {
    mainRecorderChunks.length = 0;
    recordingSize = 0;
    dialogOpen = false;
    document.getElementById('record_time').innerHTML = '00:00:00';
    document.getElementById('record_size').innerHTML = '0 B';
    showDOMElement('spinner', false);
}

//  Opens the Save dialog and does all the things
//  Called by openSaveDialog
async function openSaveDialog() {

    //  Save dialog configuration
    const videoFormat = videoFormats.find(x => x.codec === appSettings.video.codec);

    const dialogConfig = {
        title: 'Save video',
        filters: [{ name: videoFormat.saveFormat, extensions: [`*.${videoFormat.extension}`] }],
        buttonLabel: 'Save',
        defaultPath: appSettings.video.saveFileName + '.' + videoFormat.extension,
        properties: ['saveFile', 'showHiddenFiles', 'showOverwriteConfirmation', 'createDirectory', 'dontAddToRecent']
    };

    dialogConfig.filters.push({ name: 'All files', extensions: ['*'] });

    dialogOpen = true;
    let path;

    await new Promise(resolve => {
        electron.openDialog('showSaveDialogSync', dialogConfig)
            .then(p => {
                if (!!p && !p.cancelled)
                    path = p;
                resolve()
            })
            .catch(err => {
                alert(err.message);
                resolve()
            });
    });

    if (!path) {
        if (!confirm('Abandon recording without saving?'))
            openSaveDialog()
        else
            finishSaveVideo();
        return;
    }

    //  Convert recorded chunks into a blob
    let videoBlob = new Blob(mainRecorderChunks, { 'type': appSettings.video.codec });
    const videoBinary = new Int8Array(await videoBlob.arrayBuffer());

    //  Save file
    const saveSuccessful = await electron.saveVideoFile(path, videoBinary, true, false)
        .catch(err => alert(err.message));

    if (!saveSuccessful && confirm('Unable to save recording. Try again?'))
        openSaveDialog()
    else
        finishSaveVideo();
}

//  Called by mainRecorder.onstop
async function saveVideoFile() {
    closePreview();
    hideOverlay();
    clearInterval(recordInterval);
    recButton.classList.remove('recording');
    showDOMElement('spinner', true);
    openSaveDialog();
}
