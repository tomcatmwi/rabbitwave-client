
//  Starts the timer to make the currently shown image or text disappear
function setDisappearTimer(time) {
    if (typeof time === 'undefined')
        time = currentOverlayAsset.displayTime;
    if (time > 0 && !currentOverlayAsset.displayTimerActive) {
        const id = currentOverlayAsset.id;
        setTimeout(() => {
            if (!!currentOverlayAsset && currentOverlayAsset.id === id)
                hideOverlay();
        }, time * 1000);
    }
}

//  Superimposes an image asset over the video
function showImage() {
    overlayImage = null;
    const image = new Image();
    resetOverlayDrag();

    image.onload = () => {
        closePreview();
        resizeAsset(image);
        overlayImage = image;
        setDisappearTimer();
        showDOMElement(['video_controls', 'text_controls'], false);
        showDOMElement('image_controls', true);
    };

    image.src = currentSelectedAsset.filename;
}

//  Resets image drag
function resetOverlayDrag() {
    overlayDrag = {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0
    };
}

//  Superimposes a text asset over the video
function showText() {

    closePreview();
    assetList.disabled = true;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoCanvas.width;
    tempCanvas.height = videoCanvas.height;

    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.font = `${currentSelectedAsset.fontSize}px ${currentSelectedAsset.font}`;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 6;

    const lineHeight = Number((currentSelectedAsset.fontSize * 1.3).toFixed(2));

    //  Split text to multiple lines
    let widestLine = 0;
    const lines = currentSelectedAsset.text.split('\n').map(line => {
        const width = ctx.measureText(line).width;
        if (width > widestLine)
            widestLine = width;
        return { text: line, width }
    });

    //  Render text
    for (let line = 0; line < lines.length; line++) {

        let y = Number(line * lineHeight).toFixed(2);
        y = Number(y) + Number(lineHeight / 1.75) + 2;

        let x = Math.round((widestLine - lines[line].width) / 2) + 2;

        lineLength = ctx.measureText(lines[line]).width;

        if (currentSelectedAsset.outline) {
            switch (currentSelectedAsset.align) {
                case ('center'): ctx.strokeText(lines[line].text, x, y); break;
                case ('right'): ctx.strokeText(lines[line].text, x, y); break;
                default: ctx.strokeText(lines[line].text, 0, y);
            }
        }

        switch (currentSelectedAsset.align) {
            case ('center'): ctx.fillText(lines[line].text, x, y); break;
            case ('right'): ctx.fillText(lines[line].text, x, y); break;
            default: ctx.fillText(lines[line].text, 0, y);
        }
    }

    //  Find width and height of area to copy text --------------------------------------------------------------

    if (!currentSelectedAsset.calculatedData) {

        //  Get image information
        imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        //  We only need every 4th value (alpha value for each pixel)
        let counter = 0;
        const pixels = Array.from(imgData.data).filter(() => {
            if (counter === 3) {
                counter = 0;
                return true;
            }
            counter++;
            return false;
        });

        //  Find top and bottom boundaries
        let top = null;
        let bottom = null;
        let left = tempCanvas.width;
        let right = 0;

        for (let y = 0; y < pixels.length - tempCanvas.width; y += tempCanvas.width) {

            const row = pixels.slice(y, y + tempCanvas.width);

            if (row.some(pixel => pixel > 0)) {

                //  If we have no top yet, then this is it
                if (top === null)
                    // top = y == 0 ? 0 : Math.round(y / tempCanvas.width);
                    top = 0;

                //  This is the bottommost row we found so far
                bottom = Math.ceil(y / tempCanvas.width);

                //  Find leftmost and rightmost pixels
                let leftmost = null;
                let rightmost = null;
                for (let x = 0; x < row.length; x++) {
                    if (!!row[x]) {
                        if (leftmost === null)
                            leftmost = x;
                        rightmost = x;
                    }
                }

                if (leftmost < left) left = leftmost;
                if (rightmost > right) right = rightmost;
            }
        }

        currentResizeData = {
            x: currentSelectedAsset.x,
            y: currentSelectedAsset.y,
            width: right - left + 1,
            height: bottom - top + 1,
            horizontalCenter: currentSelectedAsset.center === 'center' || currentSelectedAsset.center === 'horizontal',
            verticalCenter: currentSelectedAsset.center === 'center' || currentSelectedAsset.center === 'vertical'
        }

        //  Save resize data into asset, so we won't have to calculate next time
        currentSelectedAsset.calculatedData = currentResizeData;
    }
    else
        currentResizeData = currentSelectedAsset.calculatedData;

    assetList.disabled = false;
    showDOMElement(['video_controls', 'image_controls'], false);
    showDOMElement('text_controls', true);
    overlayCanvas = tempCanvas;
    setDisappearTimer();
}

//  Superimposes a video asset over the video
function showVideo() {
    closePreview();

    //  Load video into overlayVideo element, and set properties
    if (!overlayVideo.paused)
        overlayVideo.pause();

    if (!overlayAudio.paused)
        overlayAudio.pause();

    overlayVideo.loop = currentSelectedAsset.loop;
    overlayVideo.autoplay = false;
    overlayVideo.volume = currentSelectedAsset.volume / 100;
    overlayVideo.muted = currentSelectedAsset.mute;
    overlayVideo.src = currentSelectedAsset.filename;
}

//  Loads an audio and prepares it for playing
function showAudio() {
    closePreview();

    if (!overlayVideo.paused)
        overlayVideo.pause();

    if (!overlayAudio.paused)
        overlayAudio.pause();

    overlayAudio.loop = currentSelectedAsset.loop;
    overlayAudio.autoplay = false;
    overlayAudio.volume = currentSelectedAsset.volume / 100;
    overlayAudio.src = currentSelectedAsset.filename;
}

//  Hides all overlays
function hideOverlay() {
    overlayImage = undefined;
    overlayVideo.pause();
    overlayVideo.showing = false;
    overlayAudio.pause();
    overlayCanvas = undefined;
    currentOverlayAsset = undefined;
    videoProgress.value = 0;
    document.getElementById('video_time').innerHTML = '00:00:00';
    showDOMElement(['video_controls', 'image_controls', 'text_controls'], false);
    overlayVisible = false;
}

//  Called when any asset is selected as overlay
function showOverlay() {
    hideOverlay();
    currentOverlayAsset = currentSelectedAsset;

    switch (currentSelectedAsset.type) {
        case ('image'): showImage(); break;
        case ('video'): showVideo(); break;
        case ('audio'): showAudio(); break;
        case ('text'): showText(); break;
        default:
            alert(`Unsupported asset type: "${currentSelectedAsset.type}"`);
            return;
    }
    overlayVisible = true;
}

//  Handle mouse wheel events over the 
function overlayWheel(e) {
    if (!overlayImage) return;

    const moveX = e.altKey ? e.deltaY : e.deltaX;
    const moveY = e.altKey ? 0 : e.deltaY;

    let newX = currentResizeData.x + moveX;
    if (newX > 0)
        newX = 0;
    if (newX < -(currentResizeData.width - videoCanvas.width))
        newX = -(currentResizeData.width - videoCanvas.width);

    let newY = currentResizeData.y - moveY;
    if (newY > 0)
        newY = 0;
    if (newY < -(currentResizeData.height - videoCanvas.height))
        newY = -(currentResizeData.height - videoCanvas.height);

    currentResizeData.x = newX;
    currentResizeData.y = newY;
}