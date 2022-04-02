window.onload = async () => {

    //  Initialize UI
    initUIBindings();

    //  Wait until devices are loaded
    const devices = await getDevices()
        .catch(err => alert(err));
    if (!devices) return;

    //  Initialize preview and overlay elements
    initPreviews();
    initOverlays();

    //  Load last saved settings
    //  It will start the camera automatically
    electron.store_get('lastConfig')
        .then(value => {
            if (!!value)
                loadSettings(value)
            else
                throw new Error('Unable to load your last saved configuration. Please configure your input and output devices!');
        })
        .catch(err => {
            alert(err.message);
            openSettingsPanel();
        });

    //  Load last asset list
    electron.store_get('lastAssetList')
        .then(value => {
            if (!!value)
                loadAssetList(value);
        })
        .catch(err => alert(err.message));
}