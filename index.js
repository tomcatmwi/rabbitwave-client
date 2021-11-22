const inputConstraints = {
    video: {
        width: 1280,
        height: 960,
        deviceId: null
    },
    audio: {
        deviceId: null
    }
};


Array.prototype.swap = function (x, y) {
    var b = this[x];
    this[x] = this[y];
    this[y] = b;
    return this;
}

const cameraImage = document.getElementById('camera-image');
const streamFeedback = document.getElementById('stream-feedback');
const mediaList = document.getElementById('media-list');

function getDevices() {
    return new Promise((resolve, reject) =>
        navigator.mediaDevices.enumerateDevices()
            .then(result => {

                const list_cams = document.getElementById('camera-selector');
                list_cams.options.length = 0;

                const list_mics = document.getElementById('mic-selector');
                list_mics.options.length = 0;

                const list_outs = document.getElementById('output-selector');
                list_outs.options.length = 0;

                result.forEach(x => {
                    switch (x.kind) {
                        case 'videoinput':
                            list_cams.add(new Option(x.label, x.deviceId));
                            break;
                        case 'audioinput':
                            list_mics.add(new Option(x.label, x.deviceId));
                            break;
                        case 'audiooutput':
                            list_outs.add(new Option(x.label, x.deviceId));
                            break;
                    }
                });

                resolve(true);
            })
            .catch(err => {
                alert('Úgy tűnik, nincs elérhető webkamera vagy mikrofon!');
                reject();
            }));
}

async function startCamera() {

    const res = document.getElementById('resolution-selector').value.split('x');
    inputConstraints.video.deviceId = document.getElementById('camera-selector').value;
    inputConstraints.audio.deviceId = document.getElementById('mic-selector').value;
    inputConstraints.video.width = res[0];
    inputConstraints.video.height = res[1];

    cameraImage.srcObject = await navigator.mediaDevices.getUserMedia(inputConstraints)
        .catch(err => alert('Nem sikerült aktiválni a kamerát!'));

    document.getElementById('media_preview_audio').setSinkId(document.getElementById('output-selector').value);
    streamFeedback.setSinkId(document.getElementById('output-selector').value);
    cameraImage.setSinkId(document.getElementById('output-selector').value);

    //  Ezt majd uncommentelem,  ha végre implementálják a kurva szabványt...

    // navigator.mediaDevices.selectAudioOutput({
    //     deviceId: document.getElementById('output-selector').value
    // })
    //     .then(device => console.log(device))
    //     .catch(err => console.log(err));    

}

const storageFields = ['camera-selector', 'mic-selector', 'output-selector', 'resolution-selector', 'user_name', 'server_ip'];

function saveSettings() {
    storageFields.forEach(field => {
        const value = document.getElementById(field).value;
        if (!!value)
            localStorage.setItem('rw_' + field, value);
    });
    alert('Beállítások elmentve!');
}

function loadSettings() {
    storageFields.forEach(field => {
        const value = localStorage.getItem('rw_' + field);
        if (!!value)
            document.getElementById(field).value = value;
    });
}

function settingsPanel(status = 'hidden') {
    document.getElementById('settings-panel').style.visibility = status;
}

function addNewMedia() {
    const dialogConfig = {
        title: 'Média hozzáadása',
        filters: [
            { name: 'Minden', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mkv', 'avi', 'mp4', 'mpg', 'webm', 'mp3', 'ogg', 'wav'] },
            { name: 'Képek', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
            { name: 'Videók', extensions: ['mkv', 'avi', 'mp4', 'mpg', 'webm'] },
            { name: 'Hangok', extensions: ['mp3', 'ogg', 'wav'] }
        ],
        buttonLabel: 'Hozzáadás',
        properties: ['openFile', 'showHiddenFiles', 'multiSelections', 'dontAddToRecent']
    };

    electron.openDialog('showOpenDialog', dialogConfig)
        .then(result => {
            if (result.canceled) return;
            result.filePaths
                .filter(file => !Array.from(mediaList.options).map(x => x.value).some(x => x === file))
                .forEach(file => mediaList.options.add(new Option(file, file)));
        })
        .catch(err => alert('Nem sikerült megnyitni!'));
}

function deleteMedia() {
    if (!mediaList.options.length) return;
    let index = mediaList.selectedIndex;
    mediaList.remove(index);
    if (!mediaList.options.length) {
        hideAllMediaPreviews();
        return;
    }

    if (index > mediaList.options.length - 1) index = mediaList.options.length - 1;
    mediaList.options.selectedIndex = index;
    previewMedia(mediaList.options[mediaList.selectedIndex].value);
}

function moveMedia(direction) {
    const index = mediaList.selectedIndex;
    if (index < 0) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= mediaList.options.length) return;

    mediaList.options = Array
        .from(mediaList.options)
        .swap(index, newIndex);

    mediaList.selectedIndex = newIndex;
}

function hideAllMediaPreviews() {
    const previews = document.getElementsByClassName('media-preview');
    for (t = 0; t < previews.length; t++)
        previews[t].style.display = 'none';
}

function previewMedia(filename) {

    const extension = filename.substr(filename.lastIndexOf('.') + 1, filename.length);
    let filetype;
    switch (extension) {
        case ('jpg'):
        case ('jpeg'):
        case ('gif'):
        case ('webp'):
        case ('png'): filetype = 'image'; break;
        case ('mpg'):
        case ('avi'):
        case ('mp4'):
        case ('webm'):
        case ('mkv'): filetype = 'video'; break;
        case ('mp3'):
        case ('ogg'):
        case ('wav'): filetype = 'audio'; break;
    }

    if (!filetype) {
        alert('Ismeretlen típus!');
        return;
    }

    hideAllMediaPreviews();

    document.getElementById('btn_show_media_nosound').style.display = filetype === 'video' ? 'block' : 'none';

    const mediaPreview = document.getElementById(`media_preview_${filetype}`);

    if (filetype !== 'audio')
        mediaPreview.src = filename
    else {

        //  Add audio file
        mediaPreview.children.length = 0;
        const source = document.createElement('source');
        switch (extension) {
            case 'mp3': source.type = 'audio/mpeg'; break;
            case 'ogg': source.type = 'audio/ogg'; break;
            case 'wav': source.type = 'audio/wav'; break;
        }
        source.src = filename;
        mediaPreview.appendChild(source);
    }

    mediaPreview.style.display = 'block';
}

document.getElementById('camera-selector').addEventListener('change', startCamera);
document.getElementById('mic-selector').addEventListener('change', startCamera);
document.getElementById('resolution-selector').addEventListener('change', startCamera);
document.getElementById('output-selector').addEventListener('change', startCamera);

document.getElementById('btn_save_settings').addEventListener('click', saveSettings);
document.getElementById('btn_load_settings').addEventListener('click', loadSettings);
document.getElementById('btn_refresh_devices').addEventListener('click', getDevices);
document.getElementById('btn_close_settings').addEventListener('click', () => settingsPanel('hidden'));
document.getElementById('btn_open_settings').addEventListener('click', () => settingsPanel('visible'));

document.getElementById('btn_media_new').addEventListener('click', addNewMedia);
document.getElementById('btn_media_delete').addEventListener('click', deleteMedia);
document.getElementById('btn_media_up').addEventListener('click', () => moveMedia(-1));
document.getElementById('btn_media_down').addEventListener('click', () => moveMedia(1));

document.getElementById('btn_show_media').addEventListener('click', () => alert('not yet!'));
document.getElementById('btn_show_media_nosound').addEventListener('click', () => alert('not yet!'));

mediaList.addEventListener('change', e => previewMedia(e.target.value));

window.onload = async () => {
    if (!await getDevices())
        return;

    loadSettings();
    startCamera();
}
