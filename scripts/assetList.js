//  Adds a simple divider to the asset list
async function addAssetListDivider() {
    const newAsset = { ...VideoAsset };
    newAsset.id = await electron.nanoid();
    newAsset.name = 'List divider';
    newAsset.type = 'divider';
    insertNewAsset(newAsset);
}

//  Inserts a new asset at the selected position
function insertNewAsset(asset) {
    let index = assetList.options.selectedIndex;
    if (index < 0)
        index = !!videoAssets.length ? videoAssets.length - 1 : 0;
    videoAssets.splice(index + 1, 0, asset);
    rebuildAssetList(asset.id);
}

//  Adds a new video, audio or image asset to the list
function addNewAsset() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Add asset',
        filters: [
            { name: 'All types', extensions: allExtensions },
            { name: 'Images', extensions: extensions.image },
            { name: 'Videos', extensions: extensions.video },
            { name: 'Audio files', extensions: extensions.audio },
            { name: 'All files', extensions: ['*'] }
        ],
        buttonLabel: 'Add',
        properties: ['openFile', 'showHiddenFiles', 'multiSelections', 'dontAddToRecent']
    };

    electron.openDialog('showOpenDialog', dialogConfig)
        .then(async result => {

            if (result.canceled) return;
            result.filePaths.forEach(async file => {

                //  Determine file type (image, video, audio)
                const extension = file.substr(file.lastIndexOf('.') + 1, file.length).toLowerCase();
                let type;
                Object.keys(extensions).forEach(key => {
                    if (extensions[key].includes(extension))
                        type = key;
                });

                if (!type) {
                    alert(`Unknown file type: ${extension}.\nIf you think this is a mistake, and the file is a valid asset, please rename it to one of the following extensions:\n${allExtensions.join(', ')}`);
                    return;
                }

                //  Unique asset ID
                const id = await electron.nanoid();

                //  Create asset
                const newAsset = {
                    ...VideoAsset,
                    id,
                    filename: file,
                    name: file.substr(file.lastIndexOf(pathSeparator) + 1, file.length),
                    type
                };

                //  Get asset size
                const sizes = await getAssetOriginalSize(newAsset);
                if (sizes) {
                    newAsset.width = sizes.width;
                    newAsset.height = sizes.height;
                    newAsset.originalWidth = sizes.width;
                    newAsset.originalHeight = sizes.height;
                }

                insertNewAsset(newAsset);
            });

        })
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
}

//  Adds a text asset to the video
async function addText() {
    const id = await electron.nanoid();

    const newAsset = {
        ...VideoAsset,
        id,
        name: 'Text',
        type: 'text'
    };

    insertNewAsset(newAsset);
    rebuildAssetList();
}

//  Loads a new file and updates the filename in the asset properties panel
function newAssetFile() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Replace asset',
        filters: [],
        buttonLabel: 'Replace',
        properties: ['openFile', 'showHiddenFiles', 'dontAddToRecent']
    };

    switch (document.getElementById('asset_option_type').value) {
        case ('video'): dialogConfig.filters.push({ name: 'Videos', extensions: extensions.video }); break;
        case ('audio'): dialogConfig.filters.push({ name: 'Audio files', extensions: extensions.audio }); break;
        case ('image'): dialogConfig.filters.push({ name: 'Images', extensions: extensions.image }); break;
    }

    electron.openDialog('showOpenDialog', dialogConfig)
        .then(async result => {
            if (result.canceled || !result.filePaths.length) return;
            document.getElementById('asset_option_filename').value = result.filePaths[0];

            //  Get asset size
            const sizes = await getAssetOriginalSize({
                ...currentSelectedAsset,
                width: sizes.width,
                height: sizes.height
            });

            if (!!sizes) {
                document.getElementById('asset_option_width').value = sizes.width;
                document.getElementById('asset_option_height').value = sizes.height;
                document.getElementById('asset_option_original_width').value = sizes.width;
                document.getElementById('asset_option_original_height').value = sizes.height;
            }

        })
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
}

//  Called when an asset was changed and OK clicked
function acceptAssetChanges() {
    moveValues(currentSelectedAsset, 'asset_option_', 'json');
    currentSelectedAsset.calculatedData = null;
    rebuildAssetList();
    showDOMElement('videoasset-options-panel', false);
}

//  Opens the Asset Options panel for the currently selected asset
function showAssetOptions() {

    if (!currentSelectedAsset) return;

    let elements = document.querySelectorAll("[class*='options_']");
    for (let i = 0; i < elements.length; i++)
        elements[i].classList.add('hidden');

    elements = document.querySelectorAll('.options_' + currentSelectedAsset.type);
    for (let i = 0; i < elements.length; i++)
        elements[i].classList.remove('hidden');

    moveValues(currentSelectedAsset, 'asset_option_', 'form');

    //  Enable/disable form controls based on current asset values
    document.getElementById('asset_option_x').disabled = currentSelectedAsset.center !== 'none';
    document.getElementById('asset_option_y').disabled = currentSelectedAsset.center !== 'none';

    document.getElementById('asset_option_use_display_time').checked = currentSelectedAsset.useDisplayTime;
    document.getElementById('asset_option_end_hour').disabled = !currentSelectedAsset.cutEnd;
    document.getElementById('asset_option_end_minute').disabled = !currentSelectedAsset.cutEnd;
    document.getElementById('asset_option_end_second').disabled = !currentSelectedAsset.cutEnd;

    document.getElementById('asset_option_use_display_time').checked = currentSelectedAsset.useDisplayTime;
    document.getElementById('asset_option_display_time').disabled = !currentSelectedAsset.useDisplayTime;

    const disabled = currentSelectedAsset.resize !== 'custom';
    document.getElementById('asset_option_width').disabled = disabled;
    document.getElementById('asset_option_height').disabled = disabled;
    document.getElementById('asset_options_proportional_resize').disabled = disabled;
    document.getElementById('asset_option_border').disabled = disabled;

    showDOMElement('videoasset-options-panel', true);
}

//  Rebuilds the asset list in the DOM after videoAssets changed
//  If id is specified, it will be automatically selected
function rebuildAssetList(id) {
    assetList.options.length = 0;

    videoAssets.forEach(asset => {

        const newOption = new Option(asset.name, asset.id);
        newOption.addEventListener('click', e => setCurrentSelectedAsset(false));

        if (asset.type !== 'divider') {

            //  Preview
            newOption.addEventListener('contextmenu', e => {
                e.preventDefault();
                assetList.selectedIndex = videoAssets.findIndex(x => x.id === e.target.value);
                if (overlayVisible)
                    hideOverlay()
                else {
                    if (!currentSelectedAsset || e.target.value !== currentSelectedAsset.id)
                        setCurrentSelectedAsset(true)
                    else
                        setCurrentSelectedAsset(!previewVisible);
                }

            });

            //  Show asset
            newOption.addEventListener('dblclick', () => !!currentOverlayAsset && currentOverlayAsset.id === asset.id ? hideOverlay() : showOverlay());
        }
        else
            newOption.classList.add('divider');

        assetList.add(newOption);
    });

    if (!!id) {
        assetList.value = id;
        setCurrentSelectedAsset(false);
    }
}

//  Duplicates one or more assets, under new unique IDs
function cloneAsset() {
    if (assetList.selectedIndex < 0) return;

    //  goofy way to get ids, but otherwise we'd only get Promises
    const ids = [];
    for (t = 0; t < assetList.selectedOptions.length; t++)
        ids.push(electron.nanoid());

    Promise.all(ids)
        .then(result => {
            const clonedAssets = videoAssets
                .slice(
                    assetList.selectedIndex,
                    assetList.selectedIndex + assetList.selectedOptions.length
                ).map((asset, index) => ({
                    ...asset,
                    name: 'COPY OF ' + asset.name,
                    id: result[index]
                }));

            videoAssets.splice(assetList.selectedIndex, 0, ...clonedAssets);
            rebuildAssetList(result[index]);
        });
}

//  Deletes one or more selected asset
function deleteAsset() {
    if (assetList.selectedIndex < 0) return;
    if (!confirm(`Remove ${assetList.selectedOptions.length > 1 ? assetList.selectedOptions.length + ' assets' : 'this asset'}?`, 'Remove'))
        return;

    selected = Array.from(assetList.selectedOptions).map(x => x.value);
    videoAssets = videoAssets.filter(x => !selected.includes(x.id));
    rebuildAssetList();
}

//  Moves assets up or down in the list
function moveAsset(direction) {

    if (assetList.selectedIndex < 0) return;
    selected = Array.from(assetList.selectedOptions).map(x => x.value);

    const before = videoAssets.findIndex(x => x.id === selected[0]) - 1;
    const after = before + selected.length + 1;

    //  Move up
    if (direction === -1) {
        if (before < 0) return;
        const moveItem = videoAssets.splice(before, 1);
        videoAssets.splice(after - 1, 0, moveItem[0]);
    }

    // Move down
    if (direction === 1) {
        if (after > videoAssets.length - 1) return;
        const moveItem = videoAssets.splice(after, 1);
        videoAssets.splice(before + 1, 0, moveItem[0]);
    }

    rebuildAssetList();
    for (x = 0; x < assetList.options.length; x++)
        if (selected.includes(assetList.options[x].value))
            assetList.options[x].selected = true;
}

//  Saves the current asset list and notes
async function saveAssetList() {

    if (dialogOpen) return;
    dialogOpen = true;

    const dialogConfig = {
        title: 'Save asset list',
        filters: [
            { name: 'JSON files', extensions: ['json'] },
            { name: 'All files', extensions: ['*'] }
        ],
        buttonLabel: 'Save',
        properties: ['saveFile', 'showHiddenFiles', 'showOverwriteConfirmation', 'createDirectory', 'dontAddToRecent']
    };

    const path = await electron.openDialog('showSaveDialogSync', dialogConfig)
        .catch(err => alert(err.message))
        .finally(() => dialogOpen = false);
    if (!path) return;

    electron.store_set('lastAssetList', path)
        .catch(err => alert(err.message));

    electron.saveJSON(path, {
        videoAssets,
        notes: document.getElementById('notes').value
    })
        .catch(err => alert(err.message));
}

//  Loads a saved asset list
async function loadAssetList(path) {
    if (dialogOpen && !path) return;

    if (!path) {

        const dialogConfig = {
            title: 'Load asset list',
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

    electron.store_set('lastAssetList', path)
        .catch(err => alert(err.message));

    electron.loadJSON(path)
        .then(async data => {

            const missingAssets = await electron.verifyAssets(data.videoAssets.filter(asset => ['video', 'audio', 'image'].includes(asset.type)));
            if (missingAssets.length > 0) {
                alert(`The following asset files appear to be missing:

${ missingAssets.slice(0, 12).map(asset => '- ' + asset.name).join('\n')}
${ missingAssets.length > 12 ? `\nThere's ${missingAssets.length - 12} more.` : ''}
Please verify them before recording!`);
            }

            videoAssets = data.videoAssets || [];
            document.getElementById('notes').value = data.notes;
            rebuildAssetList();
        })
        .catch(err => alert(`Unable to load asset list from ${path}`));
}

//  Runs when an asset is selected on the list.
//  Selects the current asset and opens the preview.
function setCurrentSelectedAsset(showPreview = false) {
    const asset = videoAssets.find(x => x.id === assetList.options[assetList.selectedIndex].value) || undefined;
    if (asset !== currentSelectedAsset)
        currentSelectedAsset = asset;

    document.getElementById('asset_notes').value = currentSelectedAsset.description;

    closePreview();
    if (!showPreview)
        return;

    //  Show preview
    switch (currentSelectedAsset.type) {
        case ('video'):
            previewVideo.muted = mainRecorder.state !== 'recording';
            previewVideo.src = currentSelectedAsset.filename;
            previewVideo.loop = currentSelectedAsset.loop;
            previewVideo.volume = currentSelectedAsset.volume / 100;
            previewVideo.muted = currentSelectedAsset.mute;
            previewVideo.currentTime = timeToSeconds(currentSelectedAsset.startHour, currentSelectedAsset.startMinute, currentSelectedAsset.startSecond);
            showDOMElement(['preview', 'preview-video'], true);
            previewVisible = true;
            break;
        case ('image'):
            previewImage.src = currentSelectedAsset.filename;
            showDOMElement(['preview', 'preview-image'], true);
            previewVisible = true;
            break;
        case ('audio'):
            previewAudio.src = currentSelectedAsset.filename;
            previewAudio.loop = currentSelectedAsset.loop;
            previewAudio.volume = currentSelectedAsset.volume / 100;
            previewAudio.currentTime = timeToSeconds(currentSelectedAsset.startHour, currentSelectedAsset.startMinute, currentSelectedAsset.startSecond);
            showDOMElement(['preview', 'preview-audio'], true);
            previewVisible = true;
            break;
    }

    if (currentSelectedAsset.type === 'video' || currentSelectedAsset.type === 'audio') {
        document.getElementById('video_volume').value = currentSelectedAsset.volume;
        if (currentSelectedAsset.mute) {
            muteButton.classList.remove('fa-volume');
            muteButton.classList.add('fa-volume-mute');
        } else {
            muteButton.classList.remove('fa-volume-mute');
            muteButton.classList.add('fa-volume');
        }
    }
}

//  Update the current asset's notes
function updateAssetNotes(e) {
    currentSelectedAsset.description = e.target.value;
}