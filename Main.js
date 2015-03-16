/*
    Created by Panagiotis Roubatsis
    Description: Loads the required data. Draws the paths on a canvas.
*/

//Add the nodes to the selection lists as possible sources and destinations
function addMapPointsToSelection() {
    for (var i = 0; i < map.nodes.length; i++) {
        //Don't add invisible nodes
        if (map.nodes[i].invisible) continue;

        sourceSelection.innerHTML += "<option value=\"" + map.nodes[i].name + "\">" + map.nodes[i].name + "</option>";
        destinationSelection.innerHTML += "<option value=\"" + map.nodes[i].name + "\">" + map.nodes[i].name + "</option>";
    }
}

//Draw a line on the canvas
function drawLine(x1, y1, x2, y2, thickness, color) {
    context.strokeStyle = color;

    context.beginPath();

    context.lineWidth = thickness;
    context.lineCap = "butt";

    context.moveTo(x1, y1);
    context.lineTo(x2, y2);

    context.stroke();
}

//Draw a filled circle on the canvas
function fillCircle(cx, cy, radius, color) {
    context.fillStyle = color;

    context.beginPath();
    context.arc(cx, cy, radius, 0, 2 * Math.PI);
    context.fill();
}

//Draw text on the canvas
function drawText(str, x, y) {
    context.font = "25px Arial";
    context.fillStyle = "#000";
    context.fillText(str, x - 12, y + 12);
}

//Draw the map's image to the canvas and then overlay the path.
function drawPath(aName, bName) {
    context.drawImage(img, 0, 0);
    var path = map.getPath(aName, bName);

    var jumpBuffer = [];

    for (i = 0; i < path.length; i++) {
        if (!path[i].invisible) drawLine(path[i].ax, path[i].ay, path[i].bx, path[i].by, 5, "#00FF00");
        else jumpBuffer.push(path[i]);
    }

    for (i = 0; i < jumpBuffer.length; i++) {
        fillCircle(jumpBuffer[i].ax, jumpBuffer[i].ay, 10, "#FF0000");
        fillCircle(jumpBuffer[i].bx, jumpBuffer[i].by, 10, "#FF0000");

        var jumpId = (i + 1).toString();
        drawText(jumpId, jumpBuffer[i].ax, jumpBuffer[i].ay);
        drawText(jumpId, jumpBuffer[i].bx, jumpBuffer[i].by);
    }
}

//Button callback, it gets the selected nodes and calls drawPath().
function drawSelectedPath() {
    var a = sourceSelection.value;
    var b = destinationSelection.value;
    if (a == b) return;

    drawPath(a, b);
}

//Initialize the various elements.
canvas = document.getElementById("mapCanvas");
context = canvas.getContext("2d");

img = document.getElementById("mapImage");

sourceSelection = document.getElementById("sourcePoint");
destinationSelection = document.getElementById("destinationPoint");

canvas.width = img.width;
canvas.height = img.height;

context.drawImage(img, 0, 0);

//Map data
var map;
var mapData;

//Load map data
request = new XMLHttpRequest();
request.onreadystatechange = function () {
    if (request.readyState == 4 && request.status == 200) {
        mapData = request.responseText;
        map = new Map(mapData);
        addMapPointsToSelection();
    }
}

request.open("GET", "map.txt", true);
request.send();

