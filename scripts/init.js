//  Attach events to all video elements
function initVideoElements() {

    //  Set up events of the preview video element -----------------------------------------------------------------------------

    previewVideo.addEventListener('volumechange', e => {
        currentSelectedAsset.volume = e.target.volume * 100;
        currentSelectedAsset.mute = e.target.muted;
    });

    previewAudio.addEventListener('volumechange', e => {
        currentSelectedAsset.volume = e.target.volume * 100;
        currentSelectedAsset.mute = e.target.muted;
    });

    previewVideo.addEventListener('timeupdate', () => {
        if (previewVideo.readyState !== 4)
            return;

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
            previewVideo.currentTime = videoProgress.min;
        }
    });

    //  Set up events of the overlay video element -----------------------------------------------------------------------------

    overlayVideo.addEventListener('loadedmetadata', data => {
        overlayVideo.width = data.path[0].videoWidth;
        overlayVideo.height = data.path[0].videoHeight;
        resizeAsset(overlayVideo);

        //  Set up video slider
        const startTime = timeToSeconds(currentSelectedAsset.startHour, currentSelectedAsset.startMinute, currentSelectedAsset.startSecond);
        let endTime = timeToSeconds(currentSelectedAsset.endHour, currentSelectedAsset.endMinute, currentSelectedAsset.endSecond);

        if (endTime === 0 || endTime < startTime || currentSelectedAsset.ignoreEnd)
            endTime = data.path[0].duration;

        videoProgress.min = startTime;
        videoProgress.max = endTime;
        videoProgress.step = (endTime - startTime) / 500;
        videoProgress.value = startTime;
    });

    //  On pause: turn off video audio, and switch to microphone audio
    overlayVideo.addEventListener('pause', () => {
        setTimeout(() => switchAudioTrack('mic'), 10);
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    });

    //  On play: turn off mic, and switch to video audio
    overlayVideo.addEventListener('play', () => {
        setTimeout(() => switchAudioTrack('video'), 10);
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
        setMuteButton();
    });

    //  When the entire video loaded, show controls
    overlayVideo.addEventListener('canplaythrough', async () => {
        showDOMElement('video_controls', true);
        showDOMElement(['image_controls', 'text_controls'], false);
        setMuteButton();
        overlayVideo.showing = true;
        overlayVideo.play();
    });

    //  When ended, turn off overlay
    overlayVideo.addEventListener('ended', () => {
        if (!currentOverlayAsset.loop && currentOverlayAsset.hideWhenEnds)
            setDisappearTimer(currentOverlayAsset.hideDelay);
    });

    //  Timer ticker
    overlayVideo.addEventListener('timeupdate', e => {

        //  Don't allow a position lower than the starting point
        if (overlayVideo.currentTime < videoProgress.min)
            overlayVideo.currentTime = videoProgress.min;

        //  Don't allow a position higher than the starting point
        if (!overlayVideo.ignoreEnd && overlayVideo.currentTime > videoProgress.max) {

            if (!!currentOverlayAsset && !currentOverlayAsset.loop) {

                if (currentOverlayAsset.hideWhenEnds) {
                    overlayVideo.showing = false;
                    setDisappearTimer(currentOverlayAsset.hideDelay);
                } else
                    if (!overlayVideo.paused)
                        overlayVideo.pause();
            } else
                overlayVideo.currentTime = videoProgress.min;
        }

        videoProgress.value = overlayVideo.currentTime;
        document.getElementById('video_time').innerHTML = secondsToTime(overlayVideo.currentTime);
    });

    //  Seeking disrupts audio, must re-assign audio track
    overlayVideo.addEventListener('seeked', e => {
        setTimeout(() => switchAudioTrack('video'), 10);
    });

}

//  Set up UI bindings
function initUIBindings() {
    assetList = document.getElementById('asset-list');
    videoCanvas = document.createElement('canvas');
    videoMonitor = document.getElementById('video-monitor');
    previewImage = document.getElementById('preview-image');
    previewVideo = document.getElementById('preview-video');
    previewAudio = document.getElementById('preview-audio');
    videoProgress = document.getElementById('video_progress');
    playIcon = document.getElementById('icon_video_play_pause');
    listCams = document.getElementById('settings_video_video_input_device');
    listMics = document.getElementById('settings_video_audio_input_device');
    listOuts = document.getElementById('settings_video_audio_output_device');
    recordTimer = document.getElementById('record_time');
    recButton = document.getElementById('btn_record');
    muteButton = document.getElementById('video_mute_icon');

    //  Fill codec list in general settings
    videoFormats.forEach(format => document.getElementById('settings_video_codec').add(new Option(format.name, format.codec)));

    //  Dragging on the video: moves overlay
    videoMonitor.addEventListener('wheel', overlayWheel);
    videoMonitor.addEventListener('mousedown', drawStart);
    videoMonitor.addEventListener('mousemove', draw);

    //  Drawing on the canvas
    document.getElementById('btn_image_draw_pencil').addEventListener('click', toggleDrawingTools);
    document.getElementById('btn_image_draw_clear').addEventListener('click', clearDrawing);
    document.getElementById('btn_image_draw_clear').addEventListener('dblclick', toggleDrawingTools);
    document.getElementById('btn_image_color_black').addEventListener('click', () => initDrawing('black'));
    document.getElementById('btn_image_color_white').addEventListener('click', () => initDrawing('white'));
    document.getElementById('btn_image_color_red').addEventListener('click', () => initDrawing('red'));
    document.getElementById('btn_image_color_green').addEventListener('click', () => initDrawing('green'));
    document.getElementById('btn_image_color_blue').addEventListener('click', () => initDrawing('blue'));
    document.getElementById('btn_image_color_yellow').addEventListener('click', () => initDrawing('yellow'));
    document.getElementById('btn_image_color_yellowgreen').addEventListener('click', () => initDrawing('yellowgreen'));

    //  Preview
    document.getElementById('preview-close').addEventListener('click', closePreview);

    //  App settings panel
    document.getElementById('btn_settings_save_settings').addEventListener('click', saveSettings);
    document.getElementById('btn_settings_load_settings').addEventListener('click', () => loadSettings());
    document.getElementById('btn_settings_refresh_devices').addEventListener('click', getDevices);
    document.getElementById('btn_settings_apply').addEventListener('click', closeSettingsPanel);
    document.getElementById('btn_settings_cancel').addEventListener('click', cancelSettingsPanel);
    document.getElementById('btn_open_settings').addEventListener('click', openSettingsPanel);
    recButton.addEventListener('click', startRecording);

    //  Asset settings panel
    document.getElementById('btn_asset_new_file').addEventListener('click', newAssetFile);
    document.getElementById('btn_accept_asset_changes').addEventListener('click', acceptAssetChanges);
    document.getElementById('btn_close_asset_options').addEventListener('click', () => showDOMElement('videoasset-options-panel', false));

    //  Asset control buttons
    document.getElementById('btn_asset_new').addEventListener('click', addNewAsset);
    document.getElementById('btn_asset_text').addEventListener('click', addText);
    document.getElementById('btn_asset_delete').addEventListener('click', deleteAsset);
    document.getElementById('btn_asset_clone').addEventListener('click', cloneAsset);
    document.getElementById('btn_asset_up').addEventListener('click', () => moveAsset(-1));
    document.getElementById('btn_asset_down').addEventListener('click', () => moveAsset(1));
    document.getElementById('btn_asset_save').addEventListener('click', saveAssetList);
    document.getElementById('btn_asset_load').addEventListener('click', () => loadAssetList());
    document.getElementById('btn_asset_settings').addEventListener('click', showOverlayOptions);

    //  Video overlay control buttons
    document.getElementById('btn_video_play_pause').addEventListener('click', onPlayVideo);
    document.getElementById('btn_video_stop').addEventListener('click', onStopVideo);
    document.getElementById('btn_video_eject').addEventListener('click', hideOverlay);
    document.getElementById('video_progress').addEventListener('input', (e) => overlayVideo.currentTime = e.target.value);
    document.getElementById('video_volume').addEventListener('input', onSetVolume);
    document.getElementById('btn_video_mute').addEventListener('click', () => onMuteVideo());

    //  Image overlay control buttons
    document.getElementById('btn_image_hide').addEventListener('click', hideOverlay);
    document.getElementById('btn_image_fit_x').addEventListener('click', () => { currentSelectedAsset.resize = 'vertical'; resizeAsset(overlayImage); });
    document.getElementById('btn_image_fit_y').addEventListener('click', () => { currentSelectedAsset.resize = 'horizontal'; resizeAsset(overlayImage); });
    document.getElementById('btn_image_nofit').addEventListener('click', () => { currentSelectedAsset.resize = 'none'; resizeAsset(overlayImage); });
    document.getElementById('btn_text_hide').addEventListener('click', hideOverlay);

}