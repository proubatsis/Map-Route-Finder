/*
    Created by Panagiotis Roubatsis
    Description: Contains the functionanility to decode and use the map data file.
*/

//Nodes can belong to areas. Areas define certain
//characteristics that a group of nodes share. A
//node can belong to multiple areas. The rules of the
//area only apply if a source and destination node are in
//the same area when running dijkstra's algorithm.
function MapArea(index, traffic) {
    this.index = index;
    this.trafficCost = traffic;
}

//A point on the map (A vertex on the graph).
function MapNode(name, x, y, index, areas, invisible) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.index = index;
    this.areas = areas;         //Indices of areas that the node is part of
    this.invisible = invisible; //Is this an endpoint, used for routing instead of an endpoint.

    //Used for dijkstra's algorithm
    this.from = null;       //Node that we came from in dijkstra's algorithm
    this.pathCost = 0;      //The cost that it took to reach this node.

    this.copy = function () {
        return new MapNode(this.name, this.x, this.y, this.index, this.areas, this.invisible);
    }
}

//A road/route on the map (An edge on the graph).
function MapRoad(destIndex, cost, invisible) {
    this.destIndex = destIndex;
    this.cost = cost;
    this.invisible = invisible;
}

//Used to draw the route.
function PathLink(ax, ay, bx, by, invisible) {
    this.ax = ax;
    this.ay = ay;
    this.bx = bx;
    this.by = by;

    this.invisible = invisible;
}

//Loads the area data from the map's data file.
//Returns an array of MapArea objects.
function buildAreaList(mapFileContents) {
    var areas = [];
    var lines = mapFileContents.replace("\r", "").split("\n");

    var areaCount = parseInt(lines[0]);
    var offset = 1;

    for (var i = 0; i < areaCount; i += 1)
        areas.push(new MapArea(i, parseInt(lines[i + offset])));

    return areas;
}

//Loads the node data from the map's data file.
//Returns an array of MapNode objects.
function buildNodeList(mapFileContents) {
    var nodes = [];
    var lines = mapFileContents.replace("\r", "").split("\n");

    var areaCount = parseInt(lines[0]);
    var nodeCount = parseInt(lines[areaCount + 1]);
    var offset = areaCount + 2;
    
    for (i = 0; i < nodeCount; i += 1) {
        var index = i * 4 + offset;

        var name = lines[index];

        var coords = lines[index + 1].split(" ");
        var x = parseInt(coords[0]);
        var y = parseInt(coords[1]);

        var areas = [];
        var areaStrings = lines[index + 2].split(" ");
        for (j = 0; j < areaStrings.length; j += 1) areas.push(parseInt(areaStrings[j]));

        var invisible = lines[index + 3].search("I") > -1;

        nodes.push(new MapNode(name, x, y, i, areas, invisible));
    }

    return nodes;
}

//Loads the road data from the map's data file into an adjacency list.
//Returns a 2d array of MapRoad objects.
function buildAdjacencyList(mapFileContents) {
    var lines = mapFileContents.replace("\r", "").split("\n");

    var areaCount = parseInt(lines[0]);
    var nodeCount = parseInt(lines[areaCount + 1]);

    var offset = areaCount + 2 + nodeCount * 4;

    var adjacencyList = [];

    for (i = 0; i < nodeCount; i++) {

        var tokens = lines[i + offset].split(" ");
        var roads = [];

        for (j = 0; j < tokens.length; j += 3) {
            var destIndex = parseInt(tokens[j]);
            var cost = parseInt(tokens[j + 1]);
            var invisible = tokens[j + 2].search("I") > -1;
            roads.push(new MapRoad(destIndex, cost, invisible));
        }

        adjacencyList.push(roads);
    }

    return adjacencyList;
}

//Returns a MapRoad object for an adjacency between two nodes.
//Returns null if the nodes are not connected.
function getAdjacency(indexA, indexB, adjacencies) {
    roads = adjacencies[indexA];

    for (var i = 0; i < roads.length; i += 1) {
        if (roads[i].destIndex == indexB) return roads[i];
    }

    return null;
}

//Used for dijkstra's algorithm
function PriorityQueue(comparisonFunction) {
    this.comparison = comparisonFunction;
    this.data = [];

    this.push = function (val) {
        this.data.push(val);
        this.data.sort(this.comparison);
    }

    this.pop = function () {
        return this.data.pop();
    }

    this.isEmpty = function() {
        return this.data.length == 0;
    }
}

//Provides the necessary functionality for interpreting
//the data and providing a path from the start to end nodes.
function Map(mapFileContents) {
    this.areas = buildAreaList(mapFileContents);
    this.nodes = buildNodeList(mapFileContents);
    this.adjacencies = buildAdjacencyList(mapFileContents);

    //Resets the data that is used for pathfinding.
    this.reset = function () {
        for (i = 0; i < this.nodes.length; i++) {
            this.nodes[i].visited = false;
            this.nodes[i].from = null;
            this.nodes[i].pathCost = 0;
        }
    }

    //Search for a given node by name and return its index.
    //If no node with the given name is found then -1 is returned.
    this.findIndexFromName = function (name) {
        var index = -1;

        for (var i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].name.trim() == name.trim()) {
                index = i;
                break;
            }
        }

        return index;
    }

    //Returns the traffic value between two nodes if they share a common area.
    //If they are not in the same area then return 0.
    this.getTrafficBetweenNodes = function (a, b) {
        if (a.areas.length == 0 || b.areas.length == 0) return 0;

        for (var i = 0; i < a.areas.length; i++) {
            if (b.areas.indexOf(a.areas[i]) > -1) return this.areas[a.areas[i]].trafficCost;
        }

        return 0;
    }

    //Find a path using dijkstra's algorithm. Returns an array of PathLink objects.
    this.getPath = function (aName, bName, accountForTraffic) {
        //Default is false if no parameter is passed
        accountForTraffic = typeof accountForTraffic == "undefined" ? false : accountForTraffic;

        //Get indices for the start and end nodes
        var a = this.findIndexFromName(aName);
        var b = this.findIndexFromName(bName);
        var endNode;

        //If either node does not exist then there is no path.
        if (a < 0 || b < 0) return null;

        //Keep track of which nodes have been visited by the pathfinding code
        var visited = [];
        for (var i = 0; i < this.nodes.length; i++)
            visited.push(false);

        //Run dijkstra's algorithm to find the shortest path to the destination
        var queue = new PriorityQueue(function (a, b) { return b.pathCost - a.pathCost; });
        queue.push(this.nodes[a]);

        while (!queue.isEmpty()) {
            var n = queue.pop();
            visited[n.index] = true;
            
            //If the destination has been reached then stop looking for a path
            //because it has been found.
            if (n.index == b) {
                endNode = n;
                break;
            }

            //Enqueue all unvisited adjacent nodes
            for (i = 0; i < this.adjacencies[n.index].length; i++) {
                var index = this.adjacencies[n.index][i].destIndex;
                var nextNode = this.nodes[index].copy();
                if (!visited[index]) {
                    //Determine the cumulative cost of the path up to this point
                    nextNode.pathCost = n.pathCost + this.adjacencies[n.index][i].cost + 1;
                    if (accountForTraffic) nextNode.pathCost += this.getTrafficBetweenNodes(n, nextNode);

                    nextNode.from = n;
                    queue.push(nextNode);
                }
            }
        }

        //If the destination has not been reached there is no path.
        if (endNode == null) return null;

        //Retrieve the path
        var n = endNode;

        var pathNodes = [];
        while (n != null) {
            pathNodes.unshift(n);   //Add to the start of the array
            n = n.from;
        }

        var path = [];
        for (var i = 1; i < pathNodes.length; i += 1) {
            var nodeA = pathNodes[i - 1];
            var nodeB = pathNodes[i];

            var link = new PathLink(nodeA.x, nodeA.y, nodeB.x, nodeB.y, getAdjacency(nodeA.index, nodeB.index, this.adjacencies).invisible);
            path.push(link);
        }

        this.reset();
        return path;
    }

}