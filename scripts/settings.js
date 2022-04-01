function openSettingsPanel() {
    moveValues(appSettings.video, 'settings_video_', 'form');
    showDOMElement('settings-panel', true)
}

function closeSettingsPanel() {
    moveValues(appSettings.video, 'settings_video_', 'json');
    showDOMElement('settings-panel', false);
    startCamera();
}

function cancelSettingsPanel() {
    if (!appSettings.video.videoInputDevice || !appSettings.video.audioInputDevice || !appSettings.video.audioOutputDevice) {
        alert('Your devices aren\'t configured properly.\nPlease select devices and click Apply, or load a configuration you saved earlier.', 'Elon Musk is gay');
        return;
    }
    showDOMElement('settings-panel', false);
}

//  Save settings, and saves the path into local storage
async function saveSettings() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Save settings',
        filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
        ],
        buttonLabel: 'Save',
        filename: 'config.json',
        properties: ['saveFile', 'showHiddenFiles', 'showOverwriteConfirmation', 'createDirectory', 'dontAddToRecent']
    };

    const path = await electron.openDialog('showSaveDialogSync', dialogConfig)
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
    if (!path) return;

    electron.saveJSON(path, appSettings)
        .then(() => {

            //  Save settings
            electron.store_set('lastConfig', path)
                .then(() => alert(`Settings saved!`))
                .catch(err => { throw err });
        })
        .catch(err => alert(err.message));
}

//  Loads settings, and saves the path into local storage
async function loadSettings(path) {
    if (dialogOpen && !path) return;

    if (!path) {
        const dialogConfig = {
            title: 'Load settings',
            filters: [
                { name: 'JSON files', extensions: ['json'] },
                { name: 'All files', extensions: ['*'] }
            ],
            buttonLabel: 'Load',
            properties: ['openFile', 'showHiddenFiles']
        };

        dialogOpen = true;

        path = await electron.openDialog('showOpenDialog', dialogConfig)
            .catch(err => alert(err.message))
            .finally(() => dialogOpen = false);
    }

    if (!path || path.canceled) return;

    if (path.hasOwnProperty('filePaths'))
        path = path.filePaths[0];

    electron.loadJSON(path)
        .then(data => {

            if (!compareObjects(appSettings, data))
                throw new Error('Invalid configuration file.');

            //  Save settings
            electron.store_set('lastConfig', path)
                .catch(err => { throw err });

            appSettings = data;

            //  Camera IDs are different every time
            appSettings.video = {
                ...appSettings.video,
                videoInputDevice: listCams.options[0].value,
                audioInputDevice: listMics.options[0].value,
                audioOutputDevice: listOuts.options[0].value
            }

            moveValues(appSettings.video, 'settings_video_', 'form');
            startCamera();
        })
        .catch(err => {
            alert(err.message);
        });
}