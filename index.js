
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
const getAllExtensions = () => {
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
    text: null,                 //  Text
    fontSize: 12,               //  Font size
    font: 'Helvetica',          //  Font name
    justify: 'center',          //  Justification: "left", "center", "right"
    horizontalCenter: true,     //  Center horizontally on screen
    verticalCenter: true,       //  Center vertically on screen
    outline: true,              //  Black outline

    //  images and text only
    displayTime: 5,             //  time in seconds to display, 0 means stays until manually hidden

    //  video and images only
    resize: true,               //  resize to full screen
    center: true,               //  center screen
    black: true,                //  black out where it's not covering the camera image
    x: 0,                       //  x position, ignored when stretch === true, for text assets it can be "left", "center", "right"
    y: 0,                       //  y position, ignored when stretch === true, for text assets it can be "left", "center", "right"
    fade: true,                 //  fade in and out instead of just appearing

    //  video only
    mute: true,                 //  audio on / off
    hideWhenEnded: true,        //  hide automatically when video ends (ignored when loop === true)

    //  video and audio only
    startMinute: 0,             //  start position, minutes
    startSecond: 0,             //  start position, seconds
    endMinute: 0,               //  end position, minutes - 00:00 means play to the end
    endSecond: 0,               //  end position, seconds
    loop: false,                //  loop endlessly
    volume: 100,                //  volume, 0-100
    micOff: true                //  disable microphone while playing
};

//  All video assets (in the list to the right)
let videoAssets = [];

//  Image, video and audio overlays
let overlayImage = new Image();
let overlayVideo = document.createElement('video');
let overlayAudio = document.createElement('audio');

overlayVideo.addEventListener('loadedmetadata', data => {
    overlayVideo.width = data.path[0].videoWidth;
    overlayVideo.height = data.path[0].videoHeight;
})

//  Setting fields (so we know what to save/load)
const storageFields = ['camera-selector', 'mic-selector', 'output-selector', 'resolution-selector', 'video-codec-selector', 'video-bitrate-selector', 'audio-bitrate-selector', 'filename-selector'];

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

//  Stream settings
const cameraImage = document.getElementById('camera-image');
const mediaList = document.getElementById('media-list');
const overlayCanvas = document.getElementById('canvas-overlay');

//  Stream data
let outputStream = null;
let recordRTC = null;

//  Flags
let dialogOpen = false;

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
        .catch(err => alert(`Nem sikerült aktiválni a kamerát!\n${err.message}`));

    if (!stream) return;
    cameraImage.srcObject = stream;
    cameraImage.muted = false;
    cameraImage.volume = 0;

    //  Audio device selection
    // document.getElementById('media_preview_audio').setSinkId(document.getElementById('output-selector').value);
    cameraImage.setSinkId(document.getElementById('output-selector').value);

    //  Ezt majd uncommentelem,  ha végre implementálják a kurva szabványt...

    // navigator.mediaDevices.selectAudioOutput({
    //     deviceId: document.getElementById('output-selector').value
    // })
    //     .then(device => console.log(device))
    //     .catch(err => console.log(err));

}

function saveSettings() {
    storageFields.forEach(field => {
        const value = document.getElementById(field).value;
        if (!!value)
            localStorage.setItem('rw_' + field, value);
    });
    alert('Beállítások elmentve!');
}

function loadSettings() {
    storageFields.forEach(field => {
        const value = localStorage.getItem('rw_' + field);
        if (!!value)
            document.getElementById(field).value = value;
    });
}

function showPanel(id, status = 'hidden') {
    document.getElementById(id).style.visibility = status;
}

function addNewMedia() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Add media',
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
                rebuildMediaList();
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
    rebuildMediaList();
}

//  Moves values between a video asset and the asset properties panel form
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

//  Replace the file in the asset properties panel
function newAssetFile() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Replace media',
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
    const asset = videoAssets.find(x => x.id === mediaList.options[mediaList.selectedIndex].value);
    moveValues(asset, false);
    rebuildMediaList();
    showPanel('videoasset-options-panel', 'hidden');
}

function showVideoAssetOptions() {

    const asset = videoAssets.find(x => x.id === mediaList.options[mediaList.selectedIndex].value);

    let elements = document.querySelectorAll("[class*='options_']");
    for (let i = 0; i < elements.length; i++)
        elements[i].style.display = 'none';

    elements = document.querySelectorAll('.options_' + asset.type);
    for (let i = 0; i < elements.length; i++)
        elements[i].style.display = elements[i].classList.contains('selector-row') ? 'flex' : 'block';

    moveValues(asset, 'form');
    showPanel('videoasset-options-panel', 'visible');
}

function onRightClickMediaList(event) {
}

//  Rebuilds the option list after videoAssets changed
function rebuildMediaList() {
    mediaList.options.length = 0;
    videoAssets.forEach(asset => mediaList.add(new Option(asset.name, asset.id)));
}

function deleteMedia() {
    if (!mediaList.selectedIndex) return;
    selected = Array.from(mediaList.selectedOptions).map(x => x.value);
    videoAssets = videoAssets.filter(x => !selected.includes(x.id));
    rebuildMediaList();
}

function moveMedia(direction) {

    if (mediaList.selectedIndex < 0) return;
    selected = Array.from(mediaList.selectedOptions).map(x => x.value);

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

    rebuildMediaList();
    for (x = 0; x < mediaList.options.length; x++)
        if (selected.includes(mediaList.options[x].value))
            mediaList.options[x].selected = true;
}

async function saveList() {

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

    electron.saveJSON(path, videoAssets)
        .catch(err => alert(err.message));
}

async function loadList() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Load asset list',
        filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
        ],
        buttonLabel: 'Load',
        properties: ['openFile', 'showHiddenFiles']
    };

    const path = await electron.openDialog('showOpenDialog', dialogConfig)
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);

    if (!path || !path.filePaths.length || path.canceled) return;

    electron.loadJSON(path.filePaths[0])
        .then(data => {
            videoAssets = data;
            rebuildMediaList();
        })
        .catch(err => alert(err.message));
}

function startStream(stream) {
    cameraImage.srcObject(stream);
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
        recorderType: MediaStreamRecorder,
        mimeType: document.getElementById('video-codec-selector').value,
        disableLogs: true,
        audioBitsPerSecond: document.getElementById('audio-bitrate-selector').value,
        videoBitsPerSecond: document.getElementById('video-bitrate-selector').value
    });
    recordRTC.startRecording();
}

//  Calculates the proportional size of a video or image
function resizeAsset(assetData, element) {
    const width = cameraImage.getBoundingClientRect().width;
    const height = cameraImage.getBoundingClientRect().height;

    let newWidth = element.width;
    let newHeight = element.height

    if (assetData.resize) {
        if (newHeight > height) {
            newWidth = (newWidth / 100) * (height / (newHeight / 100));
            newHeight = height;
        }

        if (newWidth > width) {
            newHeight = (newHeight / 100) * (width / (newWidth / 100));
            newWidth = width;
        }
    }

    let x = assetData.x;
    let y = assetData.y;

    if (assetData.center) {
        x = (width / 2) - (newWidth / 2);
        y = (height / 2) - (newHeight / 2);
        if (x < 0) x = 0;
        if (y < 0) y = 0;
    }

    return {
        width: newWidth,
        height: newHeight,
        x,
        y
    };
}

function resetOverlays() {
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!!overlayVideo)
        overlayVideo.pause();

    if (!!overlayAudio)
        overlayAudio.pause();

    overlayImage = new Image();
}

function showMedia() {
    const asset = videoAssets.find(x => x.id === mediaList.options[mediaList.selectedIndex].value);
    if (!overlayCanvas.getContext) return;

    resetOverlays();

    let ctx = overlayCanvas.getContext('2d');

    overlayCanvas.width = cameraImage.getBoundingClientRect().width;
    overlayCanvas.height = cameraImage.getBoundingClientRect().height;

    //  Black background
    if (asset.black && (asset.type === 'image' || asset.type === 'video')) {
        ctx.fillStyle = "rgba(0, 0, 0, .8)";
        ctx.fillRect(0, 0, cameraImage.getBoundingClientRect().width, cameraImage.getBoundingClientRect().height);
    }

    if (asset.type === 'image') {
        overlayImage.onload = () => {
            const resized = resizeAsset(asset, overlayImage);
            ctx.drawImage(overlayImage, resized.x, resized.y, resized.width, resized.height);
        };
        overlayImage.src = asset.filename;
    }

    if (asset.type === 'video') {
        overlayVideo.loop = asset.loop;
        overlayVideo.volume = asset.volume / 100;
        overlayVideo.muted = asset.mute;

        let resized;

        const videoLoop = () => {
            if (!overlayVideo.paused && !overlayVideo.ended) {
                ctx.drawImage(overlayVideo, resized.x, resized.y, resized.width, resized.height);
                setTimeout(videoLoop, 1000 / 30);
            }
        }

        overlayVideo.addEventListener('loadeddata', data => {
            if (!resized) {
                resized = resizeAsset(asset, overlayVideo);
                overlayVideo.play();
                setTimeout(videoLoop, 1000 / 30);
            }
        });
        overlayVideo.src = asset.filename;
    }



}

function initUIBindings() {

    showPanel('videoasset-options-panel', 'hidden');

    document.getElementById('camera-selector').addEventListener('change', startCamera);
    document.getElementById('mic-selector').addEventListener('change', startCamera);
    document.getElementById('resolution-selector').addEventListener('change', startCamera);
    document.getElementById('output-selector').addEventListener('change', startCamera);

    document.getElementById('btn_save_settings').addEventListener('click', saveSettings);
    document.getElementById('btn_load_settings').addEventListener('click', loadSettings);
    document.getElementById('btn_refresh_devices').addEventListener('click', getDevices);
    document.getElementById('btn_close_settings').addEventListener('click', () => showPanel('settings-panel', 'hidden'));
    document.getElementById('btn_open_settings').addEventListener('click', () => showPanel('settings-panel', 'visible'));
    document.getElementById('btn_start').addEventListener('click', () => startRecording());

    document.getElementById('media-list').addEventListener('dblclick', () => showVideoAssetOptions());
    document.getElementById('btn_asset_new_file').addEventListener('click', newAssetFile);
    document.getElementById('btn_accept_asset_changes').addEventListener('click', () => acceptAssetChanges());
    document.getElementById('btn_close_asset_options').addEventListener('click', () => showPanel('videoasset-options-panel', 'hidden'));

    document.getElementById('btn_media_new').addEventListener('click', addNewMedia);
    document.getElementById('btn_media_text').addEventListener('click', addText);
    document.getElementById('btn_media_delete').addEventListener('click', deleteMedia);
    document.getElementById('btn_media_up').addEventListener('click', () => moveMedia(-1));
    document.getElementById('btn_media_down').addEventListener('click', () => moveMedia(1));
    document.getElementById('btn_media_save').addEventListener('click', () => saveList());
    document.getElementById('btn_media_load').addEventListener('click', () => loadList());

    document.getElementById('btn_show_media').addEventListener('click', () => showMedia());
    document.getElementById('btn_show_media_nosound').addEventListener('click', () => alert('not yet!'));

    // mediaList.addEventListener('change', e => previewMedia(e.target.value));
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

}
