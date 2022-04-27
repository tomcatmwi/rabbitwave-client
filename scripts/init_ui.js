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

    subtitleVideo = document.getElementById('subtitle-editor-video');
    btnSubtitleStart = document.getElementById('btn_subtitle_start');
    btnSubtitleEnd = document.getElementById('btn_subtitle_end');
    subtitleStart = document.getElementById('subtitle_start');
    subtitleEnd = document.getElementById('subtitle_end');
    subtitleText = document.getElementById('subtitle_text');
    btnSubtitleAdd = document.getElementById('btn_subtitle_add');
    subtitlePreview = document.getElementById('subtitle-preview');
    btnSubtitlePlayPause = document.getElementById('btn_subtitle_video_play');
    subtitleVideoSeeker = document.getElementById('subtitle_video_seeker');

    //  Fill codec list in general settings
    videoFormats.forEach(format => document.getElementById('settings_video_codec').add(new Option(format.name, format.codec)));

    //  Dragging on the video: moves overlay
    videoMonitor.addEventListener('wheel', overlayWheel);
    videoMonitor.addEventListener('wheel', drawRotate);
    videoMonitor.addEventListener('mousedown', drawStart);
    videoMonitor.addEventListener('mousemove', draw);
    videoMonitor.addEventListener('contextmenu', cancelDraw);

    document.addEventListener('keydown', e => keyDown(e))

    //  Drawing on the canvas
    document.getElementById('btn_image_draw_pencil').addEventListener('click', toggleDrawingTools);
    document.getElementById('btn_image_draw_text').addEventListener('click', () => drawText(false));
    document.getElementById('btn_image_draw_arrow').addEventListener('click', drawArrow);
    document.getElementById('btn_image_draw_clear').addEventListener('click', clearDrawing);
    document.getElementById('btn_image_draw_clear').addEventListener('dblclick', toggleDrawingTools);
    document.getElementById('btn_image_color_black').addEventListener('click', () => initDrawing('black'));
    document.getElementById('btn_image_color_white').addEventListener('click', () => initDrawing('white'));
    document.getElementById('btn_image_color_red').addEventListener('click', () => initDrawing('red'));
    document.getElementById('btn_image_color_green').addEventListener('click', () => initDrawing('green'));
    document.getElementById('btn_image_color_blue').addEventListener('click', () => initDrawing('blue'));
    document.getElementById('btn_image_color_yellow').addEventListener('click', () => initDrawing('yellow'));
    document.getElementById('btn_image_color_yellowgreen').addEventListener('click', () => initDrawing('yellowgreen'));
    document.getElementById('drawing-text-text').addEventListener('dblclick', e => e.target.value = 'Default text');

    //  Draw text popup buttons
    document.getElementById('btn_accept_drawing_text').addEventListener('click', () => drawText(true));
    document.getElementById('btn_close_drawing_text').addEventListener('click', () => showDOMElement('drawing-text-panel', false));

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

    document.getElementById('asset_option_cut_end').addEventListener('change', (e) => {
        document.getElementById('asset_option_end_hour').disabled = !e.target.checked;
        document.getElementById('asset_option_end_minute').disabled = !e.target.checked;
        document.getElementById('asset_option_end_second').disabled = !e.target.checked;
    });

    document.getElementById('asset_option_use_display_time').addEventListener('change', (e) => {
        document.getElementById('asset_option_display_time').disabled = !e.target.checked;
    });

    document.getElementById('asset_option_center').addEventListener('change', (e) => {
        document.getElementById('asset_option_x').disabled = e.target.value !== 'none';
        document.getElementById('asset_option_y').disabled = e.target.value !== 'none';
    });

    document.getElementById('asset_option_resize').addEventListener('change', (e) => {
        const disabled = e.target.value !== 'custom';
        document.getElementById('asset_option_width').disabled = disabled;
        document.getElementById('asset_option_height').disabled = disabled;
        document.getElementById('asset_options_proportional_resize').disabled = disabled;
        document.getElementById('asset_option_border').disabled = disabled;
    });

    //  Resize images/videos proportionally
    document.getElementById('asset_option_width').addEventListener('change', (e) => {
        if (!document.getElementById('asset_options_proportional_resize').checked) return;
        const percent = e.target.value / (currentSelectedAsset.originalWidth / 100);
        document.getElementById('asset_option_height').value = Math.round(percent * (currentSelectedAsset.originalHeight / 100));
    });

    document.getElementById('asset_option_height').addEventListener('change', (e) => {
        if (!document.getElementById('asset_options_proportional_resize').checked) return;
        const percent = e.target.value / (currentSelectedAsset.originalHeight / 100);
        document.getElementById('asset_option_width').value = Math.round(percent * (currentSelectedAsset.originalWidth / 100));
    });

    //  Asset control buttons
    document.getElementById('asset-list').addEventListener('change', () => setCurrentSelectedAsset(false));
    document.getElementById('btn_asset_new').addEventListener('click', addNewAsset);
    document.getElementById('btn_asset_divider').addEventListener('click', addAssetListDivider);
    document.getElementById('btn_asset_text').addEventListener('click', addText);
    document.getElementById('btn_asset_delete').addEventListener('click', deleteAsset);
    document.getElementById('btn_asset_clone').addEventListener('click', cloneAsset);
    document.getElementById('btn_asset_up').addEventListener('click', () => moveAsset(-1));
    document.getElementById('btn_asset_down').addEventListener('click', () => moveAsset(1));
    document.getElementById('btn_asset_save').addEventListener('click', saveAssetList);
    document.getElementById('btn_asset_load').addEventListener('click', () => loadAssetList());
    document.getElementById('btn_asset_settings').addEventListener('click', showAssetOptions);
    document.getElementById('btn_subtitles').addEventListener('click', openSubtitleEditor);

    //  Subtitle editor
    subtitleVideo.disablePictureInPicture = true;
    subtitleVideo.addEventListener('timeupdate', e => onSubtitleVideoTimeUpdate(e));
    document.getElementById('btn_subtitle_move_start_back').addEventListener('click', () => moveCurrentSubtitle('start', -.1));
    document.getElementById('btn_subtitle_move_start_forward').addEventListener('click', () => moveCurrentSubtitle('start', .1));
    document.getElementById('btn_subtitle_move_end_back').addEventListener('click', () => moveCurrentSubtitle('end', -.1));
    document.getElementById('btn_subtitle_move_end_forward').addEventListener('click', () => moveCurrentSubtitle('end', .1));

    document.getElementById('btn_cancel_subtitle_editor').addEventListener('click', () => closeSubtitleEditor(true));
    document.getElementById('btn_close_subtitle_editor').addEventListener('click', () => closeSubtitleEditor(false));
    btnSubtitleStart.addEventListener('click', setSubtitleStart);
    btnSubtitleEnd.addEventListener('click', setSubtitleEnd);
    btnSubtitleAdd.addEventListener('click', addSubtitle);
    subtitleText.addEventListener('input', onSubtitleChange);
    subtitleStart.addEventListener('click', e => subtitleVideo.currentTime = e.target.value);
    subtitleEnd.addEventListener('click', e => subtitleVideo.currentTime = e.target.value);
    btnSubtitlePlayPause.addEventListener('click', subtitleVideoStartStop);
    document.getElementById('btn_subtitle_video_backward').addEventListener('click', () => subtitleVideo.currentTime = subtitleVideo.currentTime - 0.1);
    document.getElementById('btn_subtitle_video_forward').addEventListener('click', () => subtitleVideo.currentTime = subtitleVideo.currentTime + 0.1);
    subtitleVideoSeeker.addEventListener('input', e => subtitleVideo.currentTime = e.target.value);

    subtitleVideo.addEventListener('loadedmetadata', (e) => {
        subtitleVideoSeeker.max = e.path[0].duration;
        subtitleVideoSeeker.value = 0;
    })

    //  Video overlay control buttons
    document.getElementById('btn_video_play_pause').addEventListener('click', playMedia);
    document.getElementById('btn_video_stop').addEventListener('click', stopMedia);
    document.getElementById('btn_video_eject').addEventListener('click', hideOverlay);
    document.getElementById('video_progress').addEventListener('input', seekMedia);
    document.getElementById('video_volume').addEventListener('input', setVolume);
    document.getElementById('btn_video_mute').addEventListener('click', () => muteMedia());

    //  Image overlay control buttons
    document.getElementById('btn_image_hide').addEventListener('click', hideOverlay);
    document.getElementById('btn_image_fit_x').addEventListener('click', () => { currentSelectedAsset.resize = 'vertical'; resizeAsset(overlayImage); });
    document.getElementById('btn_image_fit_y').addEventListener('click', () => { currentSelectedAsset.resize = 'horizontal'; resizeAsset(overlayImage); });
    document.getElementById('btn_image_nofit').addEventListener('click', () => { currentSelectedAsset.resize = 'none'; resizeAsset(overlayImage); });
    document.getElementById('btn_text_hide').addEventListener('click', hideOverlay);

    //  Asset notes
    document.getElementById('asset_notes').addEventListener('change', updateAssetNotes);
}

//  Detects general keypresses
function keyDown(e) {

    if (e.key === 'Escape') {
        showDOMElement([
            'videoasset-options-panel',
            'drawing-text-panel',
            'settings-panel'
        ], false);
    }
}
