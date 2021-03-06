function initOverlays() {

    const onCanPlayThrough = element => {
        if (!element || element.showing) return;
        showDOMElement('video_controls', true);
        showDOMElement(['image_controls', 'text_controls'], false);
        setMuteButton(element);
        element.showing = true;
        element.currentTime = timeToSeconds(currentOverlayAsset.startHour, currentOverlayAsset.startMinute, currentOverlayAsset.startSecond);

        if (currentOverlayAsset.autoplay)
            element.play()
        else
            onPause();
    }

    const setupVideoSlider = data => {
        const startTime = timeToSeconds(currentOverlayAsset.startHour, currentOverlayAsset.startMinute, currentOverlayAsset.startSecond);
        let endTime = timeToSeconds(currentOverlayAsset.endHour, currentOverlayAsset.endMinute, currentOverlayAsset.endSecond);

        if (!currentOverlayAsset.cutEnd || endTime === 0 || endTime < startTime)
            endTime = data.path[0].duration;

        videoProgress.min = startTime;
        videoProgress.max = endTime;
        videoProgress.step = (endTime - startTime) / 500;
        videoProgress.value = startTime;
    }

    const onPause = () => {
        setTimeout(() => switchAudioTrack('mic'), 10);
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    }

    const onPlay = (element) => {
        setTimeout(() => switchAudioTrack(element === overlayVideo ? 'video' : 'audio'), 10);
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
        setMuteButton(element);
    }

    const onEnded = () => {
        if (!currentOverlayAsset.loop && currentOverlayAsset.hideWhenEnds) {
            const id = currentOverlayAsset.id;
            setTimeout(() => {
                if (currentOverlayAsset.id === id)
                    hideOverlay();
            }, currentOverlayAsset.hideDelay);
        }
    }

    const onTimeUpdate = element => {
        if (!element || !currentOverlayAsset) return;

        //  Don't allow a position lower than the starting point
        if (element.currentTime < videoProgress.min)
            element.currentTime = videoProgress.min;

        //  Don't allow a position higher than the starting point
        if (currentOverlayAsset.cutEnd && element.currentTime > videoProgress.max) {

            if (!!currentOverlayAsset && !currentOverlayAsset.loop) {

                if (currentOverlayAsset.hideWhenEnds) {
                    element.showing = false;
                    setDisappearTimer(currentOverlayAsset.hideDelay);
                } else
                    if (!element.paused)
                        element.pause();
            } else
                element.currentTime = videoProgress.min;
        }

        videoProgress.value = element.currentTime;
        document.getElementById('video_time').innerHTML = secondsToTime(element.currentTime);
    }

    const onSeeked = trackName => {
        setTimeout(() => switchAudioTrack(trackName), 10);
    }

    const setMuteButton = (element) => {
        const audioStreams = element.captureStream().getAudioTracks();
        if (!audioStreams.length || element.muted) {
            muteButton.classList.remove('fa-volume');
            muteButton.classList.add('fa-volume-mute');
        } else {
            muteButton.classList.add('fa-volume');
            muteButton.classList.remove('fa-volume-mute');
        }
    }

    //  Set up events of the overlay video and audio element -----------------------------------------------------------------------------

    //  When the entire file loaded, show controls
    overlayVideo.addEventListener('canplaythrough', () => onCanPlayThrough(overlayVideo));
    overlayAudio.addEventListener('canplaythrough', () => onCanPlayThrough(overlayAudio));

    overlayVideo.addEventListener('loadedmetadata', data => {
        overlayVideo.width = data.path[0].videoWidth;
        overlayVideo.height = data.path[0].videoHeight;
        resizeAsset(overlayVideo);
        setupVideoSlider(data);
    });
    overlayAudio.addEventListener('loadedmetadata', data => setupVideoSlider(data));

    //  On pause: turn off video audio, and switch to microphone audio
    overlayVideo.addEventListener('pause', onPause);
    overlayAudio.addEventListener('pause', onPause);

    //  On play: turn off mic, and switch to video audio
    overlayVideo.addEventListener('play', () => onPlay(overlayVideo));
    overlayAudio.addEventListener('play', () => onPlay(overlayAudio));

    //  When ended, turn off overlay
    overlayVideo.addEventListener('ended', onEnded);
    overlayAudio.addEventListener('ended', onEnded);

    //  Timer ticker
    overlayVideo.addEventListener('timeupdate', () => onTimeUpdate(overlayVideo));
    overlayAudio.addEventListener('timeupdate', () => onTimeUpdate(overlayAudio));

    //  Seeking disrupts audio, must re-assign audio track
    overlayVideo.addEventListener('seeked', () => onSeeked('video'));
    overlayAudio.addEventListener('seeked', () => onSeeked('audio'));

}