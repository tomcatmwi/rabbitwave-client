let subtitles = [];
let currentSubtitleIndex;
let currentSubtitle = {
    start: null,
    end: null,
    text: null
}

//  Open the Subtitle Editor, and load the current asset's subtitles (if it has any)
function openSubtitleEditor() {
    subtitles = currentSelectedAsset.hasOwnProperty('subtitles') ? [...currentSelectedAsset.subtitles] : [];
    document.getElementById('subtitle-editor-video').src = currentSelectedAsset.filename;

    if (!currentSelectedAsset.hasOwnProperty('subtitleSettings'))
        currentSelectedAsset.subtitleSettings = { ...VideoAsset.subtitleSettings };

    document.getElementById('subtitle_color').value = currentSelectedAsset.subtitleSettings.color;
    document.getElementById('subtitle_style').value = currentSelectedAsset.subtitleSettings.style;
    renderSubtitleList();
    showDOMElement('subtitle-editor-panel', true);
}

//  Close the Subtitle Editor
function closeSubtitleEditor(cancel = false) {
    subtitleVideo.pause();
    if (!cancel) {
        currentSelectedAsset.subtitles = [...subtitles];
        currentSelectedAsset.subtitleSettings = {
            color: document.getElementById('subtitle_color').value,
            style: document.getElementById('subtitle_style').value
        }

    }
    subtitles.length = 0;
    showDOMElement('subtitle-editor-panel', false);
}

//  Sets the beginning of the currently edited subtitle
function setSubtitleStart() {
    if (btnSubtitleStart.classList.contains('active'))
        btnSubtitleStart.classList.remove('active')
    else
        btnSubtitleStart.classList.add('active');
    currentSubtitle.start = subtitleVideo.currentTime;
    subtitleStart.value = secondsToTime(subtitleVideo.currentTime, true);
    onSubtitleChange();
}

//  Sets the end of the currently edited subtitle
function setSubtitleEnd() {
    if (btnSubtitleEnd.classList.contains('active'))
        btnSubtitleEnd.classList.remove('active')
    else {
        btnSubtitleEnd.classList.add('active');
        subtitleVideo.pause();
    }
    subtitleEnd.value = secondsToTime(subtitleVideo.currentTime, true);
    currentSubtitle.end = subtitleVideo.currentTime;
    onSubtitleChange();
}

//  Update time counters and show current subtitle
function onSubtitleVideoTimeUpdate(e) {
    if (!btnSubtitleStart.classList.contains('active'))
        subtitleStart.value = secondsToTime(subtitleVideo.currentTime, true);
    if (!btnSubtitleEnd.classList.contains('active'))
        subtitleEnd.value = secondsToTime(subtitleVideo.currentTime, true);

    const subs = subtitles.filter(s => s.start <= subtitleVideo.currentTime && s.end >= subtitleVideo.currentTime);
    subtitlePreview.classList[subs.length > 1 ? 'add' : 'remove']('error');
    subtitlePreview.innerHTML = !!subs.length ? subs[0].text : '';
    subtitleVideoSeeker.value = subtitleVideo.currentTime;
}

//  Enable/disable the "add" button as needed
function onSubtitleChange(e) {
    btnSubtitleAdd.disabled = !subtitleStart || !subtitleEnd || !subtitleText.value.trim();
}

//  Adds or updates a subtitle
async function addSubtitle() {

    const newSubtitle = {
        start: currentSubtitle.start,
        end: currentSubtitle.end,
        text: subtitleText.value.trim()
    }

    if (!verifySubtitle(newSubtitle)) return;
    subtitles.push(newSubtitle);

    //  UI magic
    setSubtitleStart();
    setSubtitleEnd();
    subtitleText.value = '';
    subtitleText.focus();
    btnSubtitleAdd.disabled = true;

    currentSubtitleIndex = null;
    renderSubtitleList();
}

//  Moves the current subtitle forward or backward
function moveCurrentSubtitle(type, value) {
    currentSubtitle[type] = Number(currentSubtitle[type]) + Number(value);

    if (currentSubtitle[type] <= 0)
        currentSubtitle[type] = 0;

    if (currentSubtitle[type] >= subtitleVideo.duration)
        currentSubtitle[type] = subtitleVideo.duration;

    document.getElementById(`subtitle_${type}`).value = secondsToTime(currentSubtitle[type], true);
}

//  Renders the subtitle list
function renderSubtitleList() {
    document.getElementById('subtitles_list_body').innerHTML = null;
    subtitles = subtitles.sort((a, b) => a.start < b.start ? -1 : 1);

    subtitles.forEach((subtitle, index) => {

        subtitle.start = Number(subtitle.start);
        subtitle.end = Number(subtitle.end);

        let tr = document.createElement('tr');
        tr.id = 'subtitle_row_' + index;

        let td = document.createElement('td');
        td.innerHTML = secondsToTime(subtitle.start, true);
        td.addEventListener('click', () => subtitleVideo.currentTime = subtitles[index].start);
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = secondsToTime(subtitle.end, true);
        td.addEventListener('click', () => subtitleVideo.currentTime = subtitles[index].end);
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = subtitle.text.replace(/\n/igm, '<br />');

        tr.appendChild(td);

        td = document.createElement('td');
        let i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-times');
        td.appendChild(i);
        td.addEventListener('click', () => removeSubtitle(subtitle));
        tr.appendChild(td);

        td = document.createElement('td');
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-pencil');
        td.appendChild(i);
        td.addEventListener('click', () => editSubtitle('start', index));
        tr.appendChild(td);

        document.getElementById('subtitles_list_body').appendChild(tr);

        //  Editor row
        tr = document.createElement('tr');
        tr.id = 'subtitle_edit_row_' + index;
        tr.classList.add('hidden');

        //  Start field
        td = document.createElement('td');

        let btn = document.createElement('button');
        btn.addEventListener('click', () => moveTime(index, 'start', -.1));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-backward');
        btn.appendChild(i);
        td.appendChild(btn);

        let editField = document.createElement('input');
        editField.addEventListener('keyup', e => onKeyDownEditSubtitle(e, index));
        editField.id = 'subtitle_start_' + String(index);
        editField.type = 'text';
        editField.class = 'subtitle_edit';
        editField.field = 'start';
        editField.index = index;
        editField.value = secondsToTime(subtitle.start, true);
        td.appendChild(editField);

        btn = document.createElement('button');
        btn.addEventListener('click', () => moveTime(index, 'start', .1));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-forward');
        btn.appendChild(i);
        td.appendChild(btn);

        btn = document.createElement('button');
        btn.addEventListener('click', () => setCurrentTime(index, 'start'));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-arrow-alt-to-bottom');
        btn.appendChild(i);
        td.appendChild(btn);


        tr.appendChild(td);

        //  End field
        td = document.createElement('td');

        btn = document.createElement('button');
        btn.addEventListener('click', () => moveTime(index, 'end', -.1));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-backward');
        btn.appendChild(i);
        td.appendChild(btn);

        editField = document.createElement('input');
        editField.addEventListener('keyup', e => onKeyDownEditSubtitle(e, index));
        editField.id = 'subtitle_end_' + String(index);
        editField.type = 'text';
        editField.class = 'subtitle_edit';
        editField.field = 'end';
        editField.index = index;
        editField.value = secondsToTime(subtitle.end, true);
        td.appendChild(editField);

        btn = document.createElement('button');
        btn.addEventListener('click', () => moveTime(index, 'end', .1));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-forward');
        btn.appendChild(i);
        td.appendChild(btn);

        btn = document.createElement('button');
        btn.addEventListener('click', () => setCurrentTime(index, 'end'));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-arrow-alt-to-bottom');
        btn.appendChild(i);
        td.appendChild(btn);

        tr.appendChild(td);

        //  Text field
        td = document.createElement('td');
        editField = document.createElement('textarea');
        editField.addEventListener('keyup', e => onKeyDownEditSubtitle(e, index));

        editField.id = 'subtitle_text_' + String(index);
        editField.type = 'text';
        editField.class = 'subtitle_edit';
        editField.field = 'text';
        editField.index = index;
        editField.value = subtitle.text;

        td.appendChild(editField);
        tr.appendChild(td);

        //  Update button
        td = document.createElement('td');
        btn = document.createElement('button');
        btn.addEventListener('click', () => updateSubtitle(index));
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-check');
        btn.appendChild(i);
        td.appendChild(btn);
        tr.appendChild(td);

        //  Cancel button
        td = document.createElement('td');
        btn = document.createElement('button');
        btn.addEventListener('click', () => cancelUpdateSubtitle());
        i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-solid');
        i.classList.add('fa-times');
        btn.appendChild(i);
        td.appendChild(btn);
        tr.appendChild(td);

        document.getElementById('subtitles_list_body').appendChild(tr);
    });
}

//  Verify a subtitle that's been input
function verifySubtitle(subtitle) {

    if (!subtitle)
        return false;

    //  Check if times are set
    if (!subtitle.start || !subtitle.end) {
        alert('Subtitle timing isn\'t set!');
        return false;
    }

    //  Check start and end times
    if (subtitle.start >= subtitle.end) {
        alert('Ending time can\'t be equal or less than starting time!');
        return false;
    }

    if (!subtitle.text) {
        alert('Text isn\'t specified!');
        return false;
    }

    //  Don't allow overlaps
    if (subtitles.some((sub, index) => index !== currentSubtitleIndex && sub.start >= subtitle.start && sub.end <= subtitle.end)) {
        alert('This timing overlaps another subtitle!');
        return false;
    }

    return true;
}

//  Edit an existing subtitle
function editSubtitle(field, index) {
    cancelUpdateSubtitle();

    currentSubtitleIndex = index;

    document.getElementById(`subtitle_start_${index}`).value = secondsToTime(subtitles[index].start, true);
    document.getElementById(`subtitle_end_${index}`).value = secondsToTime(subtitles[index].end, true);
    document.getElementById(`subtitle_text_${index}`).value = subtitles[index].text;

    showDOMElement('subtitle_row_' + index, false);
    showDOMElement('subtitle_edit_row_' + index, true);

    document.getElementById(`subtitle_${field}_${index}`).focus();
    document.getElementById(`subtitle_${field}_${index}`).select();
}

//  Update an existing subtitle
function updateSubtitle(index) {
    const start = document.getElementById(`subtitle_start_${index}`).value.trim();
    const end = document.getElementById(`subtitle_end_${index}`).value.trim();
    const text = document.getElementById(`subtitle_text_${index}`).value.trim();

    if (!String(start).match(/^(\d{1,2}\:){2}(\d{1,2})\.(\d{1,3})/i)) {
        alert('Starting time is invalid!');
        return;
    }

    if (!String(end).match(/^(\d{1,2}:){2}(\d{1,2})\.(\d{1,3})/i)) {
        alert('Ending time is invalid!');
        return;
    }

    currentSubtitle = {
        start: timestampToTime(start),
        end: timestampToTime(end),
        text
    }

    if (!verifySubtitle(currentSubtitle))
        return;

    subtitles[index] = { ...currentSubtitle }

    const tds = document.getElementById('subtitle_row_' + index).getElementsByTagName('td');
    tds[0].innerHTML = start;
    tds[1].innerHTML = end;
    tds[2].innerHTML = text;

    cancelUpdateSubtitle();
}

//  End editing subtitles and hide the editor row
function cancelUpdateSubtitle() {
    const rows = document.getElementsByTagName('tr');
    const ids = [];
    for (let i = 0; i < rows.length; i++)
        if (!!rows[i].id)
            ids.push(rows[i].id);
    showDOMElement(ids.filter(x => x.includes('subtitle_edit_row_')), false);
    showDOMElement(ids.filter(x => !x.includes('subtitle_edit_row_')), true);
}

function onKeyDownEditSubtitle(e, index) {
    if (e.key === 'Enter' && !e.shiftKey)
        updateSubtitle(index);

    if (e.key === 'Escape')
        cancelUpdateSubtitle();
}

//  Removes a subtitle
function removeSubtitle(id) {
    if (!confirm('Delete this subtitle?'))
        return;
    subtitles = subtitles.filter(subtitle => subtitle !== id);
    renderSubtitleList();
}

//  Moves the start or the end time forward or backward by the specified value
function moveTime(index, type, value) {
    subtitles[index][type] = Number(subtitles[index][type]) + Number(value);

    if (subtitles[index][type] <= 0)
        subtitles[index][type] = 0;

    if (subtitles[index][type] >= subtitleVideo.duration)
        subtitles[index][type] = subtitleVideo.duration;

    document.getElementById(`subtitle_${type}_${index}`).value = secondsToTime(subtitles[index][type], true);
}

//  Sets the current time of the video as starting/ending time
function setCurrentTime(index, type) {
    subtitles[index][type] = Number(subtitleVideo.currentTime);
    document.getElementById(`subtitle_${type}_${index}`).value = secondsToTime(subtitles[index][type], true);
}

function subtitleVideoStartStop() {
    const i = btnSubtitlePlayPause.firstChild;

    if (subtitleVideo.paused) {
        i.classList.remove('fa-play');
        i.classList.add('fa-pause');
        subtitleVideo.play();
    } else {
        i.classList.remove('fa-pause');
        i.classList.add('fa-play');
        subtitleVideo.pause();
    }
}