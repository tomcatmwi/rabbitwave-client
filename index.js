
//  Video and audio settings
const inputConstraints = {
    video: {
        width: 1280,
        height: 960,
        deviceId: null
    },
    audio: {
        deviceId: null
    }
};

//  Extensions of various image files the app recognizes
const extensions = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    video: ['mkv', 'avi', 'mp4', 'mpg', 'webm'],
    audio: ['mp3', 'ogg', 'wav'],
    text: []
}

//  Aggregates all extensions into one array
function getAllExtensions() {
    let retval = [];
    Object.keys(extensions).forEach(key => retval = retval.concat(extensions[key]));
    return retval;
}

const allExtensions = getAllExtensions();

//  Video asset template
const VideoAsset = {

    id: null,                   //  unique ID, random generated
    type: null,                 //  "video", "image", "audio"
    name: null,                 //  default is filename
    filename: null,             //  full path to file
    description: null,          //  notes or description

    //  text only
    text: 'Sample text',        //  Text
    fontSize: 50,               //  Font size
    font: 'Helvetica',          //  Font name
    align: 'center',            //  Justification: "left", "center", "right"
    horizontalCenter: true,     //  Center horizontally on screen
    verticalCenter: true,       //  Center vertically on screen
    lineHeight: 15,             //  Line height if multiline
    outline: true,              //  Black outline

    //  images and text only
    displayTime: 5,             //  time in seconds to display, 0 means stays until manually hidden

    //  video and images only
    resizeBig: true,            //  resize if bigger than canvas
    resizeSmall: true,          //  resize if smaller than canvas
    center: true,               //  center screen
    black: true,                //  black out where it's not covering the camera image
    x: 0,                       //  x position, ignored when stretch === true, for text assets it can be "left", "center", "right"
    y: 0,                       //  y position, ignored when stretch === true, for text assets it can be "left", "center", "right"
    fade: true,                 //  fade in and out instead of just appearing

    //  video only
    mute: true,                 //  audio on / off
    hideWhenEnded: true,        //  hide automatically when video ends (ignored when loop === true)

    //  video and audio only
    startHour: 0,               //  start position, hours
    startMinute: 0,             //  start position, minutes
    startSecond: 0,             //  start position, seconds
    endHour: 0,                 //  end position, minutes - 00:00 means play to the end
    endMinute: 0,               //  end position, minutes - 00:00 means play to the end
    endSecond: 0,               //  end position, seconds
    loop: false,                //  loop endlessly
    volume: 100,                //  volume, 0-100
    micOff: true                //  disable microphone while playing
};

//  App settings
const appSettings = {
}

//  All video assets
let videoAssets = [];

//  Image, video and audio overlays
let cameraVideo = document.createElement('video');
let overlayImage;
let overlayVideo = document.createElement('video');
let overlayAudio = document.createElement('audio');
let overlayCanvas;
const videoProgress = document.getElementById('video_progress');
const playIcon = document.getElementById('icon_video_play_pause');

//  Temporary data storage
let currentSelectedAsset;
let currentOverlayAsset;
let currentResizeData;

//  Stream settings
const assetList = document.getElementById('asset-list');
const videoCanvas = document.getElementById('video-canvas');
const previewImage = document.getElementById('preview-image');
const previewVideo = document.getElementById('preview-video');
const previewAudio = document.getElementById('preview-audio');

//  Stream data
let outputStream = null;
let recordRTC = null;

//  Flags
let dialogOpen = false;
let videoState = null;
let recording = false;

//  Setting fields (so we know what to save/load)
//  This is to be deprecated soon
const storageFields = ['camera-selector', 'mic-selector', 'output-selector', 'resolution-selector', 'video-codec-selector', 'video-bitrate-selector', 'audio-bitrate-selector', 'filename-selector'];

//  Convert seconds into a formatted timestamp
function secondsToTime(seconds) {
    let hours = 0;
    let minutes = 0;

    while (seconds > 3600) {
        hours++;
        seconds -= 3600;
    }

    while (seconds > 60) {
        minutes++;
        seconds -= 60;
    }

    seconds = Math.round(seconds);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

//  Convert time to seconds
function timeToSeconds(hours = 0, minutes = 0, seconds = 0) {
    return Math.round((Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds));
}

//  A little fix to the Array object
Array.prototype.swap = function (x, y) {
    var b = this[x];
    this[x] = this[y];
    this[y] = b;
    return this;
}

//  Get OS path separator from Electron (via path)
let pathSeparator;
electron.pathSeparator()
    .then(x => pathSeparator = x)
    .catch(() => {
        alert('Can\'t determine path separator! Assuming "/".');
        pathSeparator = '/';
    });

function getDevices() {
    return new Promise((resolve, reject) =>
        navigator.mediaDevices.enumerateDevices()
            .then(result => {

                const list_cams = document.getElementById('camera-selector');
                list_cams.options.length = 0;

                const list_mics = document.getElementById('mic-selector');
                list_mics.options.length = 0;

                const list_outs = document.getElementById('output-selector');
                list_outs.options.length = 0;

                result.forEach(x => {
                    switch (x.kind) {
                        case 'videoinput':
                            list_cams.add(new Option(x.label, x.deviceId));
                            break;
                        case 'audioinput':
                            list_mics.add(new Option(x.label, x.deviceId));
                            break;
                        case 'audiooutput':
                            list_outs.add(new Option(x.label, x.deviceId));
                            break;
                    }
                });

                resolve(true);
            })
            .catch(err => {
                alert('Úgy tűnik, nincs elérhető webkamera vagy mikrofon!');
                reject();
            }));
}

async function startCamera() {

    const res = document.getElementById('resolution-selector').value.split('x');
    inputConstraints.video.deviceId = document.getElementById('camera-selector').value;
    inputConstraints.audio.deviceId = document.getElementById('mic-selector').value;
    inputConstraints.video.width = res[0];
    inputConstraints.video.height = res[1];

    const stream = await navigator.mediaDevices.getUserMedia(inputConstraints)
        .catch(err => alert(`Failed to activate camera!\n${err.message}`));
    if (!stream) return;

    cameraVideo.srcObject = stream;
    cameraVideo.muted = false;
    cameraVideo.autoplay = true;
    cameraVideo.volume = 0;

    //  Audio device selection
    // document.getElementById('asset_preview_audio').setSinkId(document.getElementById('output-selector').value);
    cameraVideo.setSinkId(document.getElementById('output-selector').value);

    //  Ezt majd uncommentelem,  ha végre implementálják a kurva szabványt...

    // navigator.mediaDevices.selectAudioOutput({
    //     deviceId: document.getElementById('output-selector').value
    // })
    //     .then(device => console.log(device))
    //     .catch(err => console.log(err));

    const resolutionInfo = `${document.getElementById('resolution-selector').value}, ${document.getElementById('video-bitrate-selector').value}/${document.getElementById('audio-bitrate-selector').value} bps`;


    document.getElementById('record_resolution').innerHTML = resolutionInfo;

    //  ---- Initialize video canvas ----

    videoCanvas.width = inputConstraints.video.width;
    videoCanvas.height = inputConstraints.video.height;

    const ctx = videoCanvas.getContext('2d');
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0, 0, 0, .8)";

    const cameraLoop = () => {
        ctx.drawImage(cameraVideo, 0, 0, cameraVideo.videoWidth, cameraVideo.videoHeight);

        //  Black background
        if ((!!overlayImage || overlayVideo.showing) && currentOverlayAsset.black) {
            ctx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
        }

        //  Superimpose video
        if (overlayVideo.showing) {
            ctx.drawImage(
                overlayVideo,
                currentResizeData.x,
                currentResizeData.y,
                currentResizeData.width,
                currentResizeData.height
            )
        }

        //  Superimpose image
        if (!!overlayImage)
            ctx.drawImage(
                overlayImage,
                currentResizeData.x,
                currentResizeData.y,
                currentResizeData.width,
                currentResizeData.height
            );

        //  Superimpose text
        if (!!overlayCanvas)
            ctx.drawImage(
                overlayCanvas,
                currentResizeData.sx,
                currentResizeData.sy,
                currentResizeData.width,
                currentResizeData.height,
                currentResizeData.horizontalCenter ? (videoCanvas.width / 2 - currentResizeData.width / 2) : currentResizeData.x,
                currentResizeData.verticalCenter ? (videoCanvas.height / 2 - currentResizeData.height / 2) : currentResizeData.y,
                currentResizeData.width,
                currentResizeData.height
            );

        setTimeout(cameraLoop, (1000 / 30));
    };

    cameraLoop();
}

//  Runs when an asset is clicked on the list.
//  Selects the current asset and runs the preview.
function setcurrentSelectedAsset() {
    const asset = videoAssets.find(x => x.id === assetList.options[assetList.selectedIndex].value) || undefined;
    if (asset !== currentSelectedAsset)
        currentSelectedAsset = asset;

    closePreview();
    document.getElementById('btn_preview_close').classList.remove('hidden');

    switch (currentSelectedAsset.type) {
        case ('video'):
            previewVideo.muted = recording;
            previewVideo.src = currentSelectedAsset.filename;
            previewVideo.loop = currentSelectedAsset.loop;
            previewVideo.volume = currentSelectedAsset.volume / 100;
            previewVideo.muted = currentSelectedAsset.mute;
            previewVideo.currentTime = timeToSeconds(currentSelectedAsset.startHour, currentSelectedAsset.startMinute, currentSelectedAsset.startSecond);
            showDOMElement(['preview-video', 'btn_preview_close'], true);
            break;
        case ('image'):
            previewImage.src = currentSelectedAsset.filename;
            showDOMElement(['preview-image', 'btn_preview_close'], true);
            break;
        case ('audio'):
            previewAudio.src = currentSelectedAsset.filename;
            previewAudio.loop = currentSelectedAsset.loop;
            previewAudio.volume = currentSelectedAsset.volume / 100;
            previewAudio.currentTime = timeToSeconds(currentSelectedAsset.startHour, currentSelectedAsset.startMinute, currentSelectedAsset.startSecond);
            showDOMElement(['preview-audio', 'btn_preview_close'], true);
            break;
    }

    if (currentSelectedAsset.type === 'video' || currentSelectedAsset.type === 'audio') {
        document.getElementById('video_volume').value = currentSelectedAsset.volume;
        if (currentSelectedAsset.mute) {
            document.getElementById('video_mute_icon').classList.remove('fa-volume');
            document.getElementById('video_mute_icon').classList.add('fa-volume-mute');
        } else {
            document.getElementById('video_mute_icon').classList.remove('fa-volume-mute');
            document.getElementById('video_mute_icon').classList.add('fa-volume');
        }
    }
}

function closePreview() {
    showDOMElement(['preview-video', 'preview-audio', 'preview-image', 'btn_preview_close'], false);
    previewVideo.pause();
    previewAudio.pause();
}

//  Calculates the proportional size of the current asset
function resizeAsset(element) {
    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;

    let elementWidth = element.width;
    let elementHeight = element.height

    //  Bigger than video
    if (currentSelectedAsset.resizeBig && (width < elementWidth || height < elementHeight)) {
        if (elementHeight > height) {
            elementWidth = (elementWidth / 100) * (height / (elementHeight / 100));
            elementHeight = height;
        }

        if (elementWidth > width) {
            elementHeight = (elementHeight / 100) * (width / (elementWidth / 100));
            elementWidth = width;
        }
    }

    //  Smaller than video
    else if (currentSelectedAsset.resizeSmall && (width > elementWidth || height > elementHeight)) {
        if (width > height) {
            elementWidth = (elementWidth / 100) * (height / (elementHeight / 100));
            elementHeight = height;
        }

        if (width < height) {
            elementHeight = (elementHeight / 100) * (width / (elementWidth / 100));
            elementWidth = width;
        }
    }

    //  Center element if necessary
    let x = currentSelectedAsset.x;
    let y = currentSelectedAsset.y;

    if (currentSelectedAsset.center) {
        x = (width / 2) - (elementWidth / 2);
        y = (height / 2) - (elementHeight / 2);
        if (x < 0) x = 0;
        if (y < 0) y = 0;
    }

    currentResizeData = {
        width: elementWidth,
        height: elementHeight,
        x,
        y
    };
}

//  Starts the timer to make the currently shown image or text disappear
function setDisappearTimer(time) {
    if (typeof time === 'undefined')
        time = currentOverlayAsset.displayTime;
    if (time > 0) {
        const id = currentOverlayAsset.id;
        setTimeout(() => {
            if (!!currentOverlayAsset && currentOverlayAsset.id === id)
                hideAsset();
        }, time * 1000);
    }
}

function showImage() {
    const image = new Image();

    image.onload = () => {
        closePreview();
        resizeAsset(image);
        overlayImage = image;
        setDisappearTimer();
        showDOMElement('video_controls', false);
        showDOMElement('image_controls', true);
    };

    image.src = currentSelectedAsset.filename;
}

function showText() {
    closePreview();
    assetList.disabled = true;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoCanvas.width;
    tempCanvas.height = videoCanvas.height;

    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.font = `${currentSelectedAsset.fontSize}px ${currentSelectedAsset.font}`;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 6;

    const lineHeight = Number((currentSelectedAsset.fontSize * 1.3).toFixed(2));

    //  Split text to multiple lines
    let widestLine = 0;
    const lines = currentSelectedAsset.text.split('\n').map(line => {
        const width = ctx.measureText(line).width;
        if (width > widestLine)
            widestLine = width;
        return { text: line, width }
    });

    //  Render text
    for (let line = 0; line < lines.length; line++) {

        let y = Number(line * lineHeight).toFixed(2);
        y = Number(y) + Number(lineHeight / 1.75);

        lineLength = ctx.measureText(lines[line]).width;

        if (currentSelectedAsset.outline) {
            switch (currentSelectedAsset.align) {
                case ('center'): ctx.strokeText(lines[line].text, (widestLine - lines[line].width) / 2, y); break;
                case ('right'): ctx.strokeText(lines[line].text, widestLine - lines[line].width, y); break;
                default: ctx.strokeText(lines[line].text, 0, y);
            }
        }

        switch (currentSelectedAsset.align) {
            case ('center'): ctx.fillText(lines[line].text, (widestLine - lines[line].width) / 2, y); break;
            case ('right'): ctx.fillText(lines[line].text, widestLine - lines[line].width, y); break;
            default: ctx.fillText(lines[line].text, 0, y);
        }
    }

    //  Find width and height of area to copy text

    //  Get image information
    imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    //  We only need every 4th value (alpha value for each pixel)
    let counter = 0;
    const pixels = Array.from(imgData.data).filter(() => {
        if (counter === 3) {
            counter = 0;
            return true;
        }
        counter++;
        return false;
    });

    //  Find top and bottom boundaries
    let top = null;
    let bottom = null;
    let left = tempCanvas.width;
    let right = 0;

    for (let y = 0; y < pixels.length - tempCanvas.width; y += tempCanvas.width) {

        const row = pixels.slice(y, y + tempCanvas.width);

        if (row.some(pixel => pixel > 0)) {

            //  If we have no top yet, then this is it
            if (top === null)
                top = y == 0 ? 0 : y / tempCanvas.width;

            //  This is the bottommost row we found so far
            bottom = y / tempCanvas.width;

            //  Find leftmost and rightmost pixels
            let leftmost = null;
            let rightmost = null;
            for (let x = 0; x < row.length; x++) {
                if (!!row[x]) {
                    if (leftmost === null)
                        leftmost = x;
                    rightmost = x;
                }
            }

            if (leftmost < left) left = leftmost;
            if (rightmost > right) right = rightmost;
        }
    }

    currentResizeData = {
        x: currentSelectedAsset.x,
        y: currentSelectedAsset.y,
        sx: left - 1,
        sy: top - 1,
        width: right - left + 1,
        height: bottom - top + 1,
        horizontalCenter: currentSelectedAsset.horizontalCenter,
        verticalCenter: currentSelectedAsset.verticalCenter
    }

    overlayCanvas = tempCanvas;
    setDisappearTimer();
    showDOMElement('video_controls', false);
    showDOMElement('image_controls', true);
    assetList.disabled = false;
}

function showVideo() {
    closePreview();
    overlayVideo.pause();
    overlayVideo.loop = currentSelectedAsset.loop;
    overlayVideo.autoplay = false;
    overlayVideo.volume = currentSelectedAsset.volume / 100;
    overlayVideo.muted = currentSelectedAsset.mute;
    overlayVideo.src = currentSelectedAsset.filename;
}

function showAudio() {
    closePreview();
}

function hideAsset() {
    overlayImage = undefined;
    overlayVideo.pause();
    overlayVideo.showing = false;
    overlayAudio.pause();
    overlayCanvas = undefined;
    currentOverlayAsset = undefined;
    videoProgress.value = 0;
    document.getElementById('video_time').innerHTML = '00:00:00';
    showDOMElement('video_controls', false);
    showDOMElement('image_controls', false);
}

function showAsset() {
    hideAsset();
    currentOverlayAsset = currentSelectedAsset;

    switch (currentSelectedAsset.type) {
        case ('image'): showImage(); break;
        case ('video'): showVideo(); break;
        case ('audio'): showAudio(); break;
        case ('text'): showText(); break;
        default:
            alert(`Unsupported asset type: "${currentSelectedAsset.type}"`);
    }
}

function saveSettings() {
    storageFields.forEach(async field => {
        const value = document.getElementById(field).value;
        if (!!value)
            electron.store_set('rw_' + field, value)
                .catch(err => alert(err.message));
    });
    alert('Settings saved!');
}

function loadSettings() {
    storageFields.forEach(async field => {
        electron.store_get('rw_' + field)
            .then(value => {
                if (!!value)
                    document.getElementById(field).value = value;
            })
    });
}

function showDOMElement(id, show) {
    if (!Array.isArray(id))
        id = [id];

    id.forEach(id => {
        if (show)
            document.getElementById(id).classList.remove('hidden')
        else
            document.getElementById(id).classList.add('hidden');
    });
}

function addNewAsset() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Add asset',
        filters: [
            { name: 'All types', extensions: allExtensions },
            { name: 'Images', extensions: extensions.image },
            { name: 'Videos', extensions: extensions.video },
            { name: 'Audio files', extensions: extensions.audio },
            { name: 'All files', extensions: ['*'] }
        ],
        buttonLabel: 'Add',
        properties: ['openFile', 'showHiddenFiles', 'multiSelections', 'dontAddToRecent']
    };

    electron.openDialog('showOpenDialog', dialogConfig)
        .then(async result => {
            const testVideo = document.createElement('video');

            if (result.canceled) return;
            result.filePaths.forEach(async file => {

                //  Determine file type (image, video, audio)
                const extension = file.substr(file.lastIndexOf('.') + 1, file.length);
                let type;
                Object.keys(extensions).forEach(key => {
                    if (extensions[key].includes(extension))
                        type = key;
                });

                //  Unique asset ID
                const id = await electron.nanoid();

                //  Create asset
                const newAsset = {
                    ...VideoAsset,
                    id,
                    filename: file,
                    name: file.substr(file.lastIndexOf(pathSeparator) + 1, file.length),
                    type
                };

                videoAssets.unshift(newAsset);
                rebuildAssetList();
            });

        })
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
}

async function addText() {
    const id = await electron.nanoid();

    const newAsset = {
        ...VideoAsset,
        id,
        name: 'Text',
        type: 'text'
    };

    videoAssets.unshift(newAsset);
    rebuildAssetList();
}

//  Swaps values between a video asset and the asset properties panel form
function moveValues(asset, to = 'form') {

    const keys = Object.keys(asset);
    const ids = keys.map(key => key.split('').map(char => {
        if (char === char.toUpperCase())
            return '_' + char.toLowerCase()
        else
            return char;
    }).join(''));

    keys.forEach((key, index) => {
        const element = document.getElementById('asset_option_' + ids[index]);
        if (!element)
            console.error(`Missing element: "${ids[index]}"`)
        else
            if (to === 'form')
                element[typeof asset[key] === 'boolean' ? 'checked' : 'value'] = asset[key]
            else
                asset[key] = element[typeof asset[key] === 'boolean' ? 'checked' : 'value'];
    })
}

//  Replace the filename in the asset properties panel
function newAssetFile() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Replace asset',
        filters: [],
        buttonLabel: 'Replace',
        properties: ['openFile', 'showHiddenFiles', 'dontAddToRecent']
    };

    switch (document.getElementById('asset_option_type').value) {
        case ('video'): dialogConfig.filters.push({ name: 'Videos', extensions: extensions.video }); break;
        case ('audio'): dialogConfig.filters.push({ name: 'Audio files', extensions: extensions.audio }); break;
        case ('image'): dialogConfig.filters.push({ name: 'Images', extensions: extensions.image }); break;
    }

    electron.openDialog('showOpenDialog', dialogConfig)
        .then(async result => {
            if (result.canceled || !result.filePaths.length) return;
            document.getElementById('asset_option_filename').value = result.filePaths[0];
        })
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
}

function acceptAssetChanges() {
    moveValues(currentSelectedAsset, false);
    rebuildAssetList();
    showDOMElement('videoasset-options-panel', false);
}

function showAssetOptions() {

    if (!currentSelectedAsset) return;

    let elements = document.querySelectorAll("[class*='options_']");
    for (let i = 0; i < elements.length; i++)
        elements[i].classList.add('hidden');

    elements = document.querySelectorAll('.options_' + currentSelectedAsset.type);
    for (let i = 0; i < elements.length; i++)
        elements[i].classList.remove('hidden');

    moveValues(currentSelectedAsset, 'form');
    showDOMElement('videoasset-options-panel', true);
}

//  Rebuilds the option list after videoAssets changed
function rebuildAssetList() {
    assetList.options.length = 0;

    videoAssets.forEach(asset => {
        const newOption = new Option(asset.name, asset.id);
        newOption.addEventListener('contextmenu', (e) => { showAssetOptions(); return false; });
        newOption.addEventListener('click', setcurrentSelectedAsset);
        newOption.addEventListener('dblclick', () => !!currentOverlayAsset && currentOverlayAsset.id === asset.id ? hideAsset() : showAsset());
        assetList.add(newOption);
    });
}

function cloneAsset() {
    if (assetList.selectedIndex < 0) return;

    //  goofy way to get ids, but otherwise we'd only get Promises
    const ids = [];
    for (t = 0; t < assetList.selectedOptions.length; t++)
        ids.push(electron.nanoid());

    Promise.all(ids)
        .then(result => {
            const clonedAssets = videoAssets
                .slice(
                    assetList.selectedIndex,
                    assetList.selectedIndex + assetList.selectedOptions.length
                ).map((asset, index) => ({
                    ...asset,
                    name: 'COPY OF ' + asset.name,
                    id: result[index]
                }));

            videoAssets.splice(assetList.selectedIndex, 0, ...clonedAssets);
            rebuildAssetList();
        });
}

function deleteAsset() {
    if (assetList.selectedIndex < 0) return;
    if (!confirm(`Remove ${assetList.selectedOptions.length > 1 ? assetList.selectedOptions.length + ' assets' : 'this asset'}?`, 'Remove'))
        return;

    selected = Array.from(assetList.selectedOptions).map(x => x.value);
    videoAssets = videoAssets.filter(x => !selected.includes(x.id));
    rebuildAssetList();
}

//  Moves assets up or down in the list
function moveAsset(direction) {

    if (assetList.selectedIndex < 0) return;
    selected = Array.from(assetList.selectedOptions).map(x => x.value);

    const before = videoAssets.findIndex(x => x.id === selected[0]) - 1;
    const after = before + selected.length + 1;

    //  Move up
    if (direction === -1) {
        if (before < 0) return;
        const moveItem = videoAssets.splice(before, 1);
        videoAssets.splice(after - 1, 0, moveItem[0]);
    }

    // Move down
    if (direction === 1) {
        if (after > videoAssets.length - 1) return;
        const moveItem = videoAssets.splice(after, 1);
        videoAssets.splice(before + 1, 0, moveItem[0]);
    }

    rebuildAssetList();
    for (x = 0; x < assetList.options.length; x++)
        if (selected.includes(assetList.options[x].value))
            assetList.options[x].selected = true;
}

async function saveAssetList() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Save asset list',
        filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
        ],
        buttonLabel: 'Save',
        properties: ['saveFile', 'showHiddenFiles', 'showOverwriteConfirmation', 'createDirectory', 'dontAddToRecent']
    };

    const path = await electron.openDialog('showSaveDialogSync', dialogConfig)
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
    if (!path) return;

    electron.store_set('lastAssetList', path)
        .catch(err => alert(err.message));

    electron.saveJSON(path, {
        videoAssets,
        notes: document.getElementById('notes').value
    })
        .catch(err => alert(err.message));
}

async function loadAssetList(path) {

    if (dialogOpen && !path) return;
    dialogOpen = true;

    if (!path) {
        const dialogConfig = {
            title: 'Load asset list',
            filters: [
                { name: 'JSON files', extensions: ['json'] },
                { name: 'All files', extensions: ['*'] }
            ],
            buttonLabel: 'Load',
            properties: ['openFile', 'showHiddenFiles']
        };

        path = await electron.openDialog('showOpenDialog', dialogConfig)
            .catch(err => alert(err.message))
            .finally(() => dialogOpen = false);
    }

    if (!path || !path.filePaths.length || path.canceled) return;

    electron.store_set('lastAssetList', path)
        .catch(err => alert(err.message));

    electron.loadJSON(path.filePaths[0])
        .then(data => {
            videoAssets = data.videoAssets;
            document.getElementById('notes').value = data.notes;
            rebuildAssetList();
        })
        .catch(err => alert(err.message));
}

async function startRecording() {

    const btn = document.getElementById('btn_start');

    //  If recording is running...
    if (!!recordRTC) {
        btn.style.background = 'gray';
        btn.value = 'START';
        await new Promise(resolve => recordRTC.stopRecording(() => resolve()));
        recordRTC.save(document.getElementById('filename-selector').value);
        recordRTC.destroy();
        recordRTC = null;
        return;
    }

    //  Start recording
    btn.style.background = 'red';
    btn.value = 'REC';

    recordRTC = RecordRTC(cameraImage.srcObject, {
        type: 'video',
        recorderType: AssetStreamRecorder,
        mimeType: document.getElementById('video-codec-selector').value,
        disableLogs: true,
        audioBitsPerSecond: document.getElementById('audio-bitrate-selector').value,
        videoBitsPerSecond: document.getElementById('video-bitrate-selector').value
    });
    recordRTC.startRecording();
}

function onPlayVideo() {
    if (playIcon.classList.contains('fa-pause')) {
        overlayVideo.pause();
        overlayAudio.pause();
    } else {
        overlayVideo.play();
        overlayAudio.play();
    }
}

function onStopVideo() {
    overlayVideo.currentTime = 0;
    overlayAudio.currentTime = 0;
    overlayVideo.pause();
    overlayAudio.pause();
}

function onMuteVideo(value) {
    if (typeof value !== 'undefined')
        overlayVideo.muted = value
    else
        overlayVideo.muted = !overlayVideo.muted;

    if (overlayVideo.muted) {
        document.getElementById('video_mute_icon').classList.remove('fa-volume');
        document.getElementById('video_mute_icon').classList.add('fa-volume-mute');
    } else {
        document.getElementById('video_mute_icon').classList.remove('fa-volume-mute');
        document.getElementById('video_mute_icon').classList.add('fa-volume');
    }
}

function onSetVolume(e) {
    const volume = e.target.value;
    currentSelectedAsset.volume = volume;
    overlayAudio.volume = volume / 100;
    overlayVideo.volume = volume / 100;
}

function initUIBindings() {

    previewVideo.addEventListener('volumechange', e => {
        currentSelectedAsset.volume = e.target.volume * 100;
        currentSelectedAsset.mute = e.target.muted;
    });

    previewAudio.addEventListener('volumechange', e => {
        currentSelectedAsset.volume = e.target.volume * 100;
        currentSelectedAsset.mute = e.target.muted;
    });

    previewVideo.addEventListener('loadedmetadata', data => {

        //  Set up video slider now. If we decide to superimpose the video, it'll be already set.
        const startTime = timeToSeconds(currentSelectedAsset.startHour, currentSelectedAsset.startMinute, currentSelectedAsset.startSecond);
        let endTime = timeToSeconds(currentSelectedAsset.endHour, currentSelectedAsset.endMinute, currentSelectedAsset.endSecond);

        if (endTime === 0)
            endTime = data.path[0].duration;

        videoProgress.min = startTime;
        videoProgress.max = endTime;
        videoProgress.step = (endTime - startTime) / 500;
        videoProgress.value = startTime;
    });

    previewVideo.addEventListener('timeupdate', () => {

        //  Do not let the user seek outside the time boundaries set for the asset
        if (previewVideo.currentTime < videoProgress.min) {
            previewVideo.currentTime = videoProgress.min;
            previewVideo.pause();
            alert(`Start time reached (${secondsToTime(videoProgress.min)})`);
        }
        if (previewVideo.currentTime > videoProgress.max) {
            previewVideo.currentTime = videoProgress.max;
            previewVideo.pause();
            alert(`End time reached (${secondsToTime(videoProgress.max)})`);
        }
    });

    overlayVideo.addEventListener('loadedmetadata', data => {
        overlayVideo.width = data.path[0].videoWidth;
        overlayVideo.height = data.path[0].videoHeight;
        resizeAsset(overlayVideo);
    });

    overlayVideo.addEventListener('pause', () => {
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    });

    overlayVideo.addEventListener('play', () => {
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    });

    overlayVideo.addEventListener('canplaythrough', () => {
        showDOMElement('video_controls', true);
        showDOMElement('image_controls', false);
        overlayVideo.play();
        overlayVideo.showing = true;
    });

    overlayVideo.addEventListener('ended', () => {
        if (!currentOverlayAsset.loop && currentOverlayAsset.hideWhenEnded) {
            overlayVideo.showing = false;
            setDisappearTimer(1);
        }
    });

    overlayVideo.addEventListener('timeupdate', () => {
        if (overlayVideo.currentTime < videoProgress.min)
            overlayVideo.currentTime = videoProgress.min;

        if (overlayVideo.currentTime > videoProgress.max) {
            if (!currentOverlayAsset.loop) {
                if (currentOverlayAsset.hideWhenEnded) {
                    overlayVideo.showing = false;
                    setDisappearTimer(1);
                } else
                    overlayVideo.pause();
            } else
                overlayVideo.currentTime = videoProgress.min;
        }

        videoProgress.value = overlayVideo.currentTime;
        document.getElementById('video_time').innerHTML = secondsToTime(overlayVideo.currentTime);
    });

    document.getElementById('camera-selector').addEventListener('change', startCamera);
    document.getElementById('mic-selector').addEventListener('change', startCamera);
    document.getElementById('resolution-selector').addEventListener('change', startCamera);
    document.getElementById('output-selector').addEventListener('change', startCamera);

    document.getElementById('btn_save_settings').addEventListener('click', saveSettings);
    document.getElementById('btn_load_settings').addEventListener('click', loadSettings);
    document.getElementById('btn_refresh_devices').addEventListener('click', getDevices);
    document.getElementById('btn_close_settings').addEventListener('click', () => showDOMElement('settings-panel', false));
    document.getElementById('btn_open_settings').addEventListener('click', () => showDOMElement('settings-panel', true));
    document.getElementById('btn_record').addEventListener('click', startRecording);

    document.getElementById('btn_asset_new_file').addEventListener('click', newAssetFile);
    document.getElementById('btn_accept_asset_changes').addEventListener('click', acceptAssetChanges);
    document.getElementById('btn_close_asset_options').addEventListener('click', () => showDOMElement('videoasset-options-panel', false));

    document.getElementById('btn_asset_new').addEventListener('click', addNewAsset);
    document.getElementById('btn_asset_text').addEventListener('click', addText);
    document.getElementById('btn_asset_delete').addEventListener('click', deleteAsset);
    document.getElementById('btn_asset_clone').addEventListener('click', cloneAsset);
    document.getElementById('btn_asset_up').addEventListener('click', () => moveAsset(-1));
    document.getElementById('btn_asset_down').addEventListener('click', () => moveAsset(1));
    document.getElementById('btn_asset_save').addEventListener('click', saveAssetList);
    document.getElementById('btn_asset_load').addEventListener('click', () => loadAssetList());
    document.getElementById('btn_asset_settings').addEventListener('click', showAssetOptions);

    document.getElementById('btn_video_play_pause').addEventListener('click', onPlayVideo);
    document.getElementById('btn_video_stop').addEventListener('click', onStopVideo);
    document.getElementById('btn_video_eject').addEventListener('click', hideAsset);
    document.getElementById('video_progress').addEventListener('input', (e) => overlayVideo.currentTime = e.target.value);
    document.getElementById('video_volume').addEventListener('input', onSetVolume);
    document.getElementById('btn_video_mute').addEventListener('click', () => onMuteVideo());
    document.getElementById('btn_image_hide').addEventListener('click', hideAsset);

    document.getElementById('btn_preview_close').addEventListener('click', closePreview);
}

window.onload = async () => {

    //  Initialize UI
    initUIBindings();

    //  Wait until devices are loaded
    if (!await getDevices())
        return;

    //  Load saved settings
    loadSettings();

    //  Start camera and microphone
    startCamera();

    electron.store_get('lastAssetList')
        .then(value => {
            if (!!value)
                loadAssetList(value);
        })
        .catch(err => alert(err.message));
}

/*

NOW:
- Break up JS and SCSS code to multiple imports
- Recorder function
- Audio mixing
- Display asset description
- Esc closes panels or preview

LATER:
- Save app settings to JSON
- Load app settings from JSON
- Asset list: table, not list
- Image: fit width, fit height, fit none, drag or wheel
- Break up HTML and import popups
- Overlay canvas, enable fading
- Subtitler
- Save subtitles with video asset
- Corner logo
- Save corner logo with settings

*/