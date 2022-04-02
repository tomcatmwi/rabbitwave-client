//  Called when the Play button is clicked
function playMedia() {
    const element = currentOverlayAsset.type === 'video' ? overlayVideo : overlayAudio;
    if (!element.paused)
        element.pause();
    else
        element.play();
}

//  Called when the Stop button is clicked
function stopMedia() {
    const element = currentOverlayAsset.type === 'video' ? overlayVideo : overlayAudio;
    if (!element.paused)
        element.pause();
    element.currentTime = videoProgress.min;
}

//  Called when the Mute button is clicked
function muteMedia(value) {
    const element = currentOverlayAsset.type === 'video' ? overlayVideo : overlayAudio;

    if (typeof value !== 'undefined')
        element.muted = value
    else
        element.muted = !element.muted;

    if (element.muted) {
        muteButton.classList.remove('fa-volume');
        muteButton.classList.add('fa-volume-mute');
        switchAudioTrack('mic');
    } else {
        muteButton.classList.remove('fa-volume-mute');
        muteButton.classList.add('fa-volume');
        switchAudioTrack(currentOverlayAsset.type);
    }
}

//  Called when the seeker bar is used
function seekMedia() {
    const element = currentOverlayAsset.type === 'video' ? overlayVideo : overlayAudio;
    element.currentTime = document.getElementById('video_progress').value;
}

//  Called when the volume is adjusted
function setVolume() {
    const element = currentOverlayAsset.type === 'video' ? overlayVideo : overlayAudio;
    const volume = document.getElementById('video_volume').value;
    currentSelectedAsset.volume = volume;
    element.volume = volume / 100;
}

//  Switch to the current audio track
//  If an audio track isn't available, or it's muted, falls back to mic
function switchAudioTrack(to = 'mic') {

    let source;
    switch (to) {
        case 'video': source = overlayVideo; break;
        case 'audio': source = overlayAudio; break;
        default:
            source = cameraVideo;
    }

    if (source.muted)
        source = cameraVideo;

    let audioTracks = source.captureStream().getAudioTracks();
    if (!audioTracks.length) {
        source = cameraVideo;
        audioTracks = source.captureStream().getAudioTracks();
    }
    mediaSwitcher.changeTrack(audioTracks[0]);
}
