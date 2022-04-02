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
    videoMonitor.addEventListener('contextmenu', drawEndText);

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

    //  Asset control buttons
    document.getElementById('btn_asset_new').addEventListener('click', addNewAsset);
    document.getElementById('btn_asset_text').addEventListener('click', addText);
    document.getElementById('btn_asset_delete').addEventListener('click', deleteAsset);
    document.getElementById('btn_asset_clone').addEventListener('click', cloneAsset);
    document.getElementById('btn_asset_up').addEventListener('click', () => moveAsset(-1));
    document.getElementById('btn_asset_down').addEventListener('click', () => moveAsset(1));
    document.getElementById('btn_asset_save').addEventListener('click', saveAssetList);
    document.getElementById('btn_asset_load').addEventListener('click', () => loadAssetList());
    document.getElementById('btn_asset_settings').addEventListener('click', showAssetOptions);

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
