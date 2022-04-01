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
    if (!overlayVideo.paused)
        overlayVideo.pause();
    overlayVideo.currentTime = videoProgress.min;

    if (!overlayAudio.paused)
        overlayAudio.pause();
    overlayAudio.currentTime = videoProgress.min;
}

function onMuteVideo(value) {
    if (typeof value !== 'undefined')
        overlayVideo.muted = value
    else
        overlayVideo.muted = !overlayVideo.muted;

    if (overlayVideo.muted) {
        muteButton.classList.remove('fa-volume');
        muteButton.classList.add('fa-volume-mute');
        switchAudioTrack('mic');
    } else {
        muteButton.classList.remove('fa-volume-mute');
        muteButton.classList.add('fa-volume');
        switchAudioTrack('video');
    }
}

function onSetVolume(e) {
    const volume = e.target.value;
    currentSelectedAsset.volume = volume;
    overlayAudio.volume = volume / 100;
    overlayVideo.volume = volume / 100;
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

function setMuteButton() {

    const audioStreams = overlayVideo.captureStream().getAudioTracks();
    if (!audioStreams.length || overlayVideo.muted) {
        muteButton.classList.remove('fa-volume');
        muteButton.classList.add('fa-volume-mute');
    } else {
        muteButton.classList.add('fa-volume');
        muteButton.classList.remove('fa-volume-mute');
    }

}