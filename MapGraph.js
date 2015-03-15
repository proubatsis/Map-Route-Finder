function MapNode(name, x, y, index) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.index = index;

    //Used for dijkstra's algorithm
    this.from = null;       //Node that we came from in dijkstra's algorithm
    this.pathCost = 0;      //The cost that it took to reach this node.

    this.copy = function () {
        return new MapNode(this.name, this.x, this.y, this.index);
    }
}

function MapRoad(destIndex, cost) {
    this.destIndex = destIndex;
    this.cost = cost;
}

//Used for the path
function Point(x, y) {
    this.x = x;
    this.y = y;
}

function buildNodeList(mapFileContents) {
    var nodes = []
    var lines = mapFileContents.replace("\r", "").split("\n");

    var nodeCount = parseInt(lines[0]);
    
    var index = 0;
    for (i = 1; i < nodeCount * 2; i += 2) {
        var name = lines[i];

        var coords = lines[i + 1].split(" ");
        var x = parseInt(coords[0]);
        var y = parseInt(coords[1]);

        nodes.push(new MapNode(name, x, y, index));
        index += 1;
    }

    return nodes;
}

function buildAdjacencyList(mapFileContents) {
    var lines = mapFileContents.replace("\r", "").split("\n");
    var nodeCount = parseInt(lines[0]);

    var adjacencyList = []

    //Skip the lines with the nodes and start directly at the adjacency information
    var startIndex = nodeCount * 2 + 1;
    var endIndex = startIndex + nodeCount - 1;

    for (i = startIndex; i <= endIndex; i++) {
        var tokens = lines[i].split(" ");
        var roads = []
        for (j = 0; j < tokens.length; j += 2) {
            var destIndex = parseInt(tokens[j]);
            var cost = parseInt(tokens[j + 1]);
            roads.push(new MapRoad(destIndex, cost));
        }
        adjacencyList.push(roads);
    }

    return adjacencyList;
}

//Used for dijkstra's algorithm
function PriorityQueue(comparisonFunction) {
    this.comparison = comparisonFunction;
    this.data = []

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

function Map(mapFileContents) {
    this.nodes = buildNodeList(mapFileContents);
    this.adjacencies = buildAdjacencyList(mapFileContents);

    this.reset = function () {
        for (i = 0; i < this.nodes.length; i++) {
            this.nodes[i].visited = false;
            this.nodes[i].from = null;
            this.nodes[i].pathCost = 0;
        }
    }

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

    this.getPath = function (aName, bName) {
        var a = this.findIndexFromName(aName);
        var b = this.findIndexFromName(bName);
        var endNode;

        if (a < 0 || b < 0) return null;

        var visited = [];
        for (var i = 0; i < this.nodes.length; i++)
            visited.push(false);

        //Run dijkstra's algorithm to find the shortest path to the destination
        var queue = new PriorityQueue(function (a, b) { return b.pathCost - a.pathCost; });
        queue.push(this.nodes[a]);

        while (!queue.isEmpty()) {
            var n = queue.pop();
            visited[n.index] = true;
            
            if (n.index == b) {
                endNode = n;
                break;
            }

            for (i = 0; i < this.adjacencies[n.index].length; i++) {
                var index = this.adjacencies[n.index][i].destIndex;
                var nextNode = this.nodes[index].copy();
                if (!visited[index]) {
                    nextNode.pathCost = n.pathCost + this.adjacencies[n.index][i].cost + 1;
                    nextNode.from = n;
                    queue.push(nextNode);
                }
            }
        }

        if (endNode == null) return null;

        //Retrieve the path in reverse order
        var n = endNode;

        var path = [];
        while (n != null) {
            path.push(new Point(n.x, n.y));
            n = n.from;
        }

        this.reset();
        return path;
    }

}