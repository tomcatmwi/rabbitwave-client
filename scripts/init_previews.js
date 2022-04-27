function initPreviews() {

    const previewVolumeChange = (element) => {
        currentSelectedAsset.volume = element.volume * 100;
        currentSelectedAsset.mute = element.muted;
    }

    const previewTimeUpdate = (element) => {
        if (element.readyState !== 4)
            return;

        //  Do not let the user seek outside the time boundaries set for the asset
        if (element.currentTime < videoProgress.min) {
            element.currentTime = videoProgress.min;
            element.pause();
            alert(`Start time reached (${secondsToTime(videoProgress.min)})`);
        }
        if (element.currentTime > videoProgress.max) {
            element.currentTime = videoProgress.max;
            element.pause();
            alert(`End time reached (${secondsToTime(videoProgress.max)})`);
            element.currentTime = videoProgress.min;
        }
    }

    //  Set up events of the preview video element -----------------------------------------------------------------------------

    previewVideo.addEventListener('volumechange', () => {
        previewVolumeChange(previewVideo);
    });

    previewVideo.addEventListener('timeupdate', () => {
        previewTimeUpdate(previewVideo)
    });

    //  Set up events of the preview audio element -----------------------------------------------------------------------------

    previewAudio.addEventListener('volumechange', () => {
        previewVolumeChange(previewVideo);
    });

    previewAudio.addEventListener('timeupdate', () => {
        previewTimeUpdate(previewVideo)
    });

}