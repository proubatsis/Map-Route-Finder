function getMapData() {
    request = new XMLHttpRequest();
    request.open("GET", "map.txt", false);
    request.send();

    return request.responseText;
}

canvas = document.getElementById("mapCanvas");
context = canvas.getContext("2d");

img = document.getElementById("mapImage");
mapData = getMapData();

sourceSelection = document.getElementById("sourcePoint");
destinationSelection = document.getElementById("destinationPoint");

map = new Map(mapData);

canvas.width = img.width;
canvas.height = img.height;

context.drawImage(img, 0, 0);

function addMapPointsToSelection() {
    for (var i = 0; i < map.nodes.length; i++) {
        sourceSelection.innerHTML += "<option value=\"" + map.nodes[i].name + "\">" + map.nodes[i].name + "</option>";
        destinationSelection.innerHTML += "<option value=\"" + map.nodes[i].name + "\">" + map.nodes[i].name + "</option>";
    }
}

function drawLine(p1, p2, thickness, color) {
    context.strokeStyle = color;

    context.beginPath();

    context.lineWidth = thickness;
    context.lineCap = "butt";

    context.moveTo(p1.x, p1.y);
    context.lineTo(p2.x, p2.y);

    context.stroke();
}

function drawPath(aName, bName) {
    context.drawImage(img, 0, 0);
    var path = map.getPath(aName, bName);

    for (i = 1; i < path.length; i++) {
        drawLine(path[i - 1], path[i], 5, "#00FF00");
    }
}

function drawSelectedPath() {
    var a = sourceSelection.value;
    var b = destinationSelection.value;
    if (a == b) return;

    drawPath(a, b);
}

addMapPointsToSelection();
