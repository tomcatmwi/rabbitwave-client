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
    drawing.active = true;
}

//  Start drawing
function drawStart(e) {
    drawing.x = (drawing.canvas.width / 1000) * (e.clientX / (videoMonitor.clientWidth / 1000));
    drawing.y = (drawing.canvas.height / 1000) * (e.clientY / (videoMonitor.clientHeight / 1000));
    drawing.prevX = drawing.x;
    drawing.prevY = drawing.y;
}

//  Drawing in progress
function draw(e) {
    if (!drawing.active || e.buttons === 0) return;

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
    const colorButtonIds = [];
    for (let i = 0; i < buttons.length; i++)
        colorButtonIds.push(buttons[i].id);
    colorButtonIds.push('btn_image_draw_clear');

    showDOMElement(colorButtonIds, !btnPencil.classList.contains('hidden'));
    showDOMElement('btn_image_draw_pencil', btnPencil.classList.contains('hidden'));
    drawing.active = btnPencil.classList.contains('hidden');
}