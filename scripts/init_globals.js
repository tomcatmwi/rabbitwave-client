//  A little fix to the Array object
Array.prototype.swap = function (x, y) {
    var b = this[x];
    this[x] = this[y];
    this[y] = b;
    return this;
}

//  Get OS path separator from Electron (via path)
let pathSeparator, mediaSwitcher;

electron.pathSeparator()
    .then(x => pathSeparator = x)
    .catch(() => {
        alert('Can\'t determine path separator! Assuming "/".');
        pathSeparator = '/';
    });

//  File extensions which the app recognizes as importable assets
const extensions = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    video: ['mkv', 'avi', 'mp4', 'mpg', 'webm'],
    audio: ['mp3', 'ogg', 'wav'],
    text: ['txt']
}

let allExtensions = [];
Object.keys(extensions).forEach(key => allExtensions = allExtensions.concat(extensions[key]));

//  For identifying codecs, extensions, and format names
const videoFormats = [
    { codec: 'video/webm;codecs=h264', extension: 'webm', name: 'WEBM, H264', saveFormat: 'WebM videos' },
    { codec: 'video/mp4', extension: 'mp4', name: 'MP4', saveFormat: 'MP4 videos' },
    { codec: 'video/webm;codecs=vp9', extension: 'webm', name: 'WEBM, VP9' },
    { codec: 'video/webm;codecs=vp8', extension: 'webm', name: 'WEBM, VP8' },
    { codec: 'video/x-matroska;codecs=avc1', extension: 'webm', name: 'WEBM, Matroska' }
]

//  App settings
let appSettings = {
    video: {
        videoInputDevice: null,
        audioInputDevice: null,
        audioOutputDevice: null,
        resolution: '1280x720',
        codec: 'video/webm;codecs=h264',
        videoBitrate: 5000,
        audioBitrate: 1400,
        saveFileName: 'vlog'
    },
    app: {
        //  For future use
    }
};

//  Video asset template
const VideoAsset = {

    id: 'xxxxxxxxxx',           //  unique ID, random generated
    type: 'unknown',            //  "video", "image", "audio"
    name: '',                   //  default is filename
    filename: '',               //  full path to file
    description: '',            //  notes or description
    calculatedData: null,       //  any kind of calculated data, such as resize, etc
    transition: 'fade',         //  transition effect when appearing or disappearing (not currently implemented)

    //  text only
    text: 'Sample text',        //  Text
    fontSize: 50,               //  Font size
    font: 'Helvetica',          //  Font name
    align: 'center',            //  Justification: "left", "center", "right"
    lineHeight: 15,             //  Line height if multiline
    outline: true,              //  Black outline

    //  images and text only
    displayTime: 5,             //  display time in seconds, disappears when passed
    useDisplayTime: true,   //  if false, display timer is off

    //  video and images only
    resize: 'fit',              //  resize method: "fit", "vertical", "horizontal", "none", "custom"
    width: 320,                 //  width, if resize is "custom"
    height: 200,                //  height, if resize is "custom"
    originalWidth: 0,           //  original width
    originalHeight: 0,          //  original height
    border: 'none',             //  border about asset, if size is "custom". Values: "none", "black", "white"
    center: 'center',           //  center on video
    black: true,                //  black out where it's not covering the camera image
    x: 0,                       //  x position, ignored when stretch === true, for text assets it can be "left", "center", "right"
    y: 0,                       //  y position, ignored when stretch === true, for text assets it can be "left", "center", "right"

    //  video only
    mute: true,                 //  audio on / off
    hideWhenEnds: true,         //  hide automatically when video ends (ignored when loop === true)
    hideDelay: 1,               //  delay to hide video when ended in seconds

    //  video and audio only
    startHour: 0,               //  start position, hours
    startMinute: 0,             //  start position, minutes
    startSecond: 0,             //  start position, seconds
    cutEnd: false,              //  cuts off video at set end time
    endHour: 0,                 //  end position, minutes
    endMinute: 0,               //  end position, minutes
    endSecond: 0,               //  end position, seconds
    loop: false,                //  loop endlessly
    volume: 100,                //  volume, 0-100
    autoplay: true              //  play automatically as it appears
};

//  This will store the asset list
let videoAssets = [];

//  Image, video and audio overlays

//  Video element for the camera/mic
let cameraVideo = document.createElement("video");

//  Stores the current timestamp
let recordTime;

//  Interval for the recording timer
let recordInterval;

//  The overlay image, which will become an Image() when needed
let overlayImage;

//  Enables / disables resizing the currently shown image
let overlayImageResized = true;

//  Stores where the currently shown image was dragged
let overlayDrag = {
    prevX: 0,
    prevY: 0,
    x: 0,
    y: 0
}

//  Overlay video and audio element. These will be superimposed on the camera image.
let overlayVideo = document.createElement("video");
let overlayAudio = new Audio();

//  General canvas. When it takes the value of a Canvas object, its content will
//  be automatically superimposed as overlay.
let overlayCanvas;

//  The asset that's currently selected in the asset list
let currentSelectedAsset;

//  The asset that's currently overlayed
let currentOverlayAsset;

//  Supplementary data, if the currently overlayed asset is resized
let currentResizeData;

//  Shortcuts for HTML DOM elements
let assetList, videoCanvas, previewImage, previewAudio, videoProgress, playIcon, listCams, listMics, listOuts, recButton, muteButton;

//  MediaRecorder instance
let mainRecorder = null;

//  What are we recording?
const mainRecorderChunks = [];

//  How big is it?
let recordingSize = 0;

//  Is a dialog box currently open?
let dialogOpen = false;

//  Is the preview currently open?
let previewVisible = false;

//  Is the overlay currently on?
let overlayVisible = false;

//  Drawing canvas
let drawing = {
    active: false,
    canvas: document.createElement('canvas'),
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    text: null,
    arrow: {
        active: false,
        x: -1,
        y: -1
    }
};
drawing.ctx = drawing.canvas.getContext('2d')
