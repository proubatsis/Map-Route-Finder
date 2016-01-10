/*
    Copyright (C) 2015 Panagiotis Roubatsis

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

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
function MapAdjacency(destIndex, cost, invisible) {
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

//Returns a MapAdjacency object for an adjacency between two nodes.
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
    data = JSON.parse(mapFileContents);
    this.areas = data.areas;
    this.adjacencies = data.adjacencies;
    nodes_data = data.nodes;

    //Take the json data and create map objects so that it has the copy() method and
    //from and path_cost properties.
    this.nodes = nodes_data.map(function(node)
    {
        return new MapNode(node.name, node.x, node.y, node.index, node.areas, node.invisible);
    });

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