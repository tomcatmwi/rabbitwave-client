
//  Convert seconds into a formatted timestamp
function secondsToTime(seconds, showMilliseconds = false) {
    let hours = 0;
    let minutes = 0;

    while (seconds > 3600) {
        hours++;
        seconds -= 3600;
    }

    while (seconds > 60) {
        minutes++;
        seconds -= 60;
    }

    let retval = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).substr(0, String(seconds).indexOf('.')).padStart(2, '0')}`;

    if (showMilliseconds)
        retval += String(seconds).substr(String(seconds).indexOf('.'), 4).padEnd(4, '0');

    return retval;
}

//  Convert timestamp to time
function timestampToTime(timestamp) {
    let retval = 0;
    timestamp.split(':').forEach((value, index) => {
        switch (index) {
            case 0: retval += Number(value) * 3600; break;
            case 1: retval += Number(value) * 60; break;
            case 2: retval += Number(value); break;
        }
    });
    return retval;
}

//  Convert time to seconds
function timeToSeconds(hours = 0, minutes = 0, seconds = 0) {
    return Math.round((Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds));
}

//  Shows or hides one or more DOM elements
function showDOMElement(id, show) {
    if (!Array.isArray(id))
        id = [id];

    id.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Element not found: ${id}`);
            return;
        }
        element.classList[show ? 'remove' : 'add']('hidden');
    });
}

//  Gets the original size of an asset from a file
async function getAssetOriginalSize(asset) {
    if (asset.type !== 'video' && asset.type !== 'image') return;
    let sizes;

    if (asset.type === 'video') {
        sizes = await new Promise(resolve => {
            const tempVideo = document.createElement('video');
            tempVideo.addEventListener('loadedmetadata', e => {
                resolve({
                    width: e.path[0].videoWidth,
                    height: e.path[0].videoHeight
                });
            });
            tempVideo.src = asset.filename;
        });
    }

    if (asset.type === 'image') {
        sizes = await new Promise(resolve => {
            const tempImg = new Image();
            tempImg.onload = e => {
                resolve({
                    width: tempImg.width,
                    height: tempImg.height
                });
            }
            tempImg.src = asset.filename;
        });
    }

    return sizes;
}

//  Resizes and centers the currently overlayed asset
function resizeAsset(element) {
    overlayImageResized = true;
    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;

    let newWidth = Number(element.width);
    let newHeight = Number(element.height);

    let resize = currentSelectedAsset.resize || 'fit';

    //  Resize
    if (resize === 'custom') {
        newWidth = currentSelectedAsset.width;
        newHeight = currentSelectedAsset.height;
    }

    if (resize === 'fit') {
        newWidth = (newWidth / 100) * (height / (newHeight / 100));
        newHeight = height;

        if (newWidth > width) {
            newHeight = (newHeight / 100) * (width / (newWidth / 100));
            newWidth = width;
        }
    }

    if (resize === 'horizontal') {
        newHeight = (newHeight / 100) * (width / (newWidth / 100));
        newWidth = width;
    }

    if (resize === 'vertical') {
        newWidth = (newWidth / 100) * (height / (newHeight / 100));
        newHeight = height;
    }

    let x = currentSelectedAsset.x;
    let y = currentSelectedAsset.y;

    //  Center element if necessary
    if (currentSelectedAsset.center === 'center' || currentSelectedAsset.center === 'horizontal')
        x = (width / 2) - (newWidth / 2);

    if (currentSelectedAsset.center === 'center' || currentSelectedAsset.center === 'vertical')
        y = (height / 2) - (newHeight / 2);

    currentResizeData = {
        width: newWidth,
        height: newHeight,
        x,
        y
    };
}

//  Hides the asset preview floater
function closePreview() {
    showDOMElement(['preview', 'preview-video', 'preview-audio', 'preview-image'], false);
    previewVisible = false;
    previewVideo.pause();
    previewAudio.pause();
}

//  Moves values between a HTML form and the corresponding JSON object
//  All input elements of the form must begin with prefix
function moveValues(json, prefix, to = 'form') {

    if (!json || !prefix)
        return;

    const keys = Object.keys(json);
    const ids = keys.map(key => key.split('').map(char => {
        if (char === char.toUpperCase())
            return '_' + char.toLowerCase()
        else
            return char;
    }).join(''));

    keys.forEach((key, index) => {
        const element = document.getElementById(prefix + ids[index]);
        if (!element)
            console.log(`Missing form element: "${ids[index]}"`)
        else
            if (to === 'form') {
                if (json[key] !== null)
                    element[typeof json[key] === 'boolean' ? 'checked' : 'value'] = json[key];
            }
            else {
                let val = element[typeof json[key] === 'boolean' ? 'checked' : 'value'];
                if (typeof val !== 'undefined' && !isNaN(val) && typeof val !== 'boolean' && val !== null && val !== '')
                    val = Number(val);
                json[key] = val;
            }
    });

}

//  Compares two objects to verify whether they have the same key structure
function compareObjects(source, target) {
    if (!source || !target || typeof source !== 'object' || typeof target !== 'object')
        return false;

    //  Collect all nodes from both objects

    const targetKeys = [];
    const sourceKeys = [];

    const findKeys = (slice, path, saveTo) => {
        Object.keys(slice).forEach(key => {

            const keyPath = (!!path ? path + '.' : '') + key;

            saveTo.push(keyPath);

            let hasChildren = false;

            if (slice[key] === null || typeof slice[key] !== 'object')
                return;

            try {
                hasChildren = Object.keys(slice[key]).length > 0;
            } catch (e) {
                return;
            }
            if (hasChildren)
                findKeys(slice[key], keyPath, saveTo);
        });
    }

    findKeys(source, null, sourceKeys);
    findKeys(target, null, targetKeys);

    //  Compare the two arrays
    if (sourceKeys.length !== targetKeys.length)
        return false;

    let keysSourceIdentical = 0;
    let keysTargetIdentical = 0;

    sourceKeys.forEach(key => {
        if (targetKeys.includes(key))
            keysSourceIdentical++;
    });

    targetKeys.forEach(key => {
        if (sourceKeys.includes(key))
            keysTargetIdentical++;
    });

    return (keysSourceIdentical === keysTargetIdentical && keysSourceIdentical === sourceKeys.length && keysTargetIdentical === targetKeys.length);
}

//  Prettifies a numeric value as a filesize
function prettifyBytes(bytes = 0) {
    let retval = '0 B';
    const units = [' B', ' KB', ' MB', ' GB', ' TB'];

    units.forEach((unit, index) => {
        const pow = Math.pow(1024, index);
        if (bytes >= pow)
            retval = `${(bytes / pow).toFixed(2)} ${units[index]}`
    });

    return retval;
}

//  Sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}