//  Clear current drawing
function clearDrawing() {
    drawing.ctx.clearRect(0, 0, drawing.canvas.width, drawing.canvas.height);
}

//  Button clicked, start drawing
function initDrawing(color) {
    const buttons = document.querySelectorAll("[id*='btn_image_color_']");
    for (let i = 0; i < buttons.length; i++)
        buttons[i].classList.remove('btn_on');

    document.getElementById('btn_image_color_' + color).classList.add('btn_on');
    drawing.ctx.lineWidth = Math.round(videoCanvas.width / 256);
    drawing.ctx.strokeStyle = color;
    drawing.ctx.fillStyle = color;
    drawing.ctx.font = '25px Helvetica';
    drawing.active = true;
}

//  Activates arrow drawing
function drawArrow() {
    if (!drawing.active) return;
    drawing.arrow.active = true;
    drawing.arrow.x = -1;
    drawing.arrow.y = -1;
}

//  Start drawing
function drawStart(e) {
    const clientX = (drawing.canvas.width / 1000) * (e.clientX / (videoMonitor.clientWidth / 1000));
    const clientY = (drawing.canvas.height / 1000) * (e.clientY / (videoMonitor.clientHeight / 1000));
    if (clientX < 0 || clientY < 0) return;

    //  If text is on, just put it there
    if (drawing.text) {
        drawing.ctx.fillText(drawing.text, clientX, clientY + 15);
        drawEndText();
        return;
    }

    //  If arrow drawing is on, draw arrow
    if (!!drawing.arrow.active && drawing.arrow.x === -1 && drawing.arrow.y === -1) {
        drawing.arrow.x = clientX;
        drawing.arrow.y = clientY;
        return;
    }

    if (!!drawing.arrow.active && drawing.arrow.x > -1 && drawing.arrow.y > -1) {

        const dx = clientX - drawing.arrow.x;
        const dy = clientY - drawing.arrow.y;
        const angle = Math.atan2(dy, dx);

        //  Draw arrow line

        const lineEndX = drawing.arrow.x * (.02) + clientX * .98
        const lineEndY = drawing.arrow.y * (.02) + clientY * .98;

        drawing.ctx.beginPath();
        drawing.ctx.moveTo(drawing.arrow.x, drawing.arrow.y);
        drawing.ctx.lineTo(lineEndX, lineEndY);
        drawing.ctx.stroke();

        //  Draw arrowhead
        const headlen = 30;

        const trianglePoints = [
            { x: clientX, y: clientY },
            { x: clientX - headlen * Math.cos(angle - Math.PI / 6), y: clientY - headlen * Math.sin(angle - Math.PI / 6) },
            { x: clientX - headlen * Math.cos(angle + Math.PI / 6), y: clientY - headlen * Math.sin(angle + Math.PI / 6) }
        ]

        drawing.ctx.beginPath();
        drawing.ctx.moveTo(trianglePoints[0].x, trianglePoints[0].y);
        drawing.ctx.lineTo(trianglePoints[1].x, trianglePoints[1].y);
        drawing.ctx.lineTo(trianglePoints[2].x, trianglePoints[2].y);
        drawing.ctx.moveTo(trianglePoints[1].x, trianglePoints[1].y);
        drawing.ctx.lineTo(trianglePoints[2].x, trianglePoints[2].y);
        drawing.ctx.fill();
        drawing.ctx.closePath();

        drawing.arrow.x = -1;
        drawing.arrow.y = -1;
        drawing.arrow.active = false;
        return;
    }

    drawing.x = clientX;
    drawing.y = clientY;
    drawing.prevX = drawing.x;
    drawing.prevY = drawing.y;
}

//  Drawing in progress
function draw(e) {
    if (!drawing.active || e.buttons === 0) return;
    drawing.arrow.active = false;

    drawing.prevX = drawing.x;
    drawing.prevY = drawing.y;

    drawing.x = (drawing.canvas.width / 1000) * (e.clientX / (videoMonitor.clientWidth / 1000));
    drawing.y = (drawing.canvas.height / 1000) * (e.clientY / (videoMonitor.clientHeight / 1000));

    drawing.ctx.beginPath();
    drawing.ctx.moveTo(drawing.prevX, drawing.prevY);
    drawing.ctx.lineTo(drawing.x, drawing.y);
    drawing.ctx.stroke();
    drawing.ctx.closePath();
}

//  Toggle drawing tools on/off
function toggleDrawingTools() {
    const btnPencil = document.getElementById('btn_image_draw_pencil');
    const buttons = document.querySelectorAll("[id*='btn_image_color_']");
    let colorButtonIds = [];
    for (let i = 0; i < buttons.length; i++)
        colorButtonIds.push(buttons[i].id);
    colorButtonIds = [
        'btn_image_draw_clear',
        'btn_image_draw_text',
        'btn_image_draw_arrow',
        ...colorButtonIds
    ];

    showDOMElement(colorButtonIds, !btnPencil.classList.contains('hidden'));
    showDOMElement('btn_image_draw_pencil', btnPencil.classList.contains('hidden'));
    drawing.active = btnPencil.classList.contains('hidden');
}

function drawText(textSelected = false) {
    if (!drawing.active) return;
    const textField = document.getElementById('drawing-text-text');
    if (!textSelected) {
        showDOMElement('drawing-text-panel', true);
        textField.value = '';
        textField.focus();
        return;
    }

    showDOMElement('drawing-text-panel', false);
    drawing.ctx.font = `${document.getElementById('drawing-text-font-size').value}px ${document.getElementById('drawing-text-font').value}`;
    drawing.text = textField.value.trim();
    videoMonitor.classList.add('text');
}

function drawEndText() {
    drawing.text = null;
    videoMonitor.classList.remove('text');
}