"use strict";

/** @module roottotipplot */

import {min,max,select} from "d3";
import {
    AbstractLayout,
    VertexStyle,
    makeVerticesFromNodes
} from "./abstractLayout";

/**
 * The RootToTipPlot class
 */
export class RootToTipPlot extends AbstractLayout{


    /**
     * The constructor.
     * @param tree
     * @param settings
     */
    constructor(tree, settings = {}) {
        super(tree,{externalNodeLabelAnnotationName:null,regressionFilter:()=>true,...settings})

    }

    layout() {
        const treeNodes = this._getTreeNodes();

        this[makeVerticesFromNodes](treeNodes);
        // console.log(this._vertices)
        // update the node locations (vertices)
        treeNodes.forEach((n) => {
            const v = this._nodeMap.get(n);

            this.setYPosition(v, null);
            this.setXPosition(v, null);

        });

        const usedVertices = this._vertices.filter(this.settings.regressionFilter);
        this.regression  = this.leastSquares(usedVertices);


        //TODO rerooting doesn't update line?!!
        let x1 = min(this._vertices, d => d.x);
        let x2 = max(this._vertices, d => d.x);
        let y1 = 0.0;
        let y2 = max(usedVertices, d => d.y);
        if (usedVertices.filter(v=>v.visibility===VertexStyle.INCLUDED).length > 1 && this.regression.slope > 0.0) {
            x1 = this.regression.xIntercept;
            y2 =this.regression.y(x2)
        }else if(usedVertices.filter(v=>v.visibility===VertexStyle.INCLUDED).length > 1 && this.regression.slope < 0.0 ){
            x2 = this.regression.xIntercept;
            y1= this.regression.y(x1);
            y2=0;
        }

        const startPoint = {key:"startPoint",visibility:VertexStyle.HIDDEN,x:x1,y:y1};
        const endPoint = {key:"endPoint",visibility:VertexStyle.HIDDEN,x:x2,y:y2};

        this._vertices.push(startPoint);
        this._nodeMap.set("startPoint",startPoint);
        this._vertices.push(endPoint);
        this._nodeMap.set("endPoint",endPoint);
        this._edges=[{v0:startPoint,v1:endPoint,key:"line",classes:[]}];
        this.layoutKnown = true;

    }


    _getTreeNodes() {
        return this.tree.externalNodes;
    }
    setInitialY() {
        return 0;
    }
    setInitialX() {
        return 0;
    }
    setXPosition(vertex,currentX){
        vertex.x = vertex.node.annotations.date;
        return 0;
    }

    setYPosition(vertex,currentY){
        vertex.y = this.tree.rootToTipLength(vertex.node);
        return vertex.y;
    }

    get horizontalDomain() {
        if (!this.layoutKnown) {
            this.layout();
        }
        const xPositions = [...this._vertices.map(d=>d.x),min(this._vertices.map(d=>d.x))];
        return [min(xPositions),max(xPositions)];
    }

    get verticalDomain() {
        if (!this.layoutKnown) {
            this.layout();
        }
        const yPositions = [...this._vertices.map(d=>d.y),min(this._vertices.map(d=>d.y))];
        return [max(yPositions),min(yPositions)];
    }
    get edges() {
        if (!this.layoutKnown) {
            this.layout();
        }
        return this._edges;
    }

    /**
     * returns slope, intercept and r-square of the line
     * @param data
     * @returns {{slope: number, xIntercept: number, yIntercept: number, rSquare: number, y: (function(*): number)}}
     */
    leastSquares(data) {

        const xBar = data.reduce((a, b) => (a + b.x), 0.0) / data.length;
        const yBar = data.reduce((a, b) => (a + b.y), 0.0) / data.length;

        const ssXX = data.map((d) => Math.pow(d.x - xBar, 2))
            .reduce((a, b) => a + b, 0.0);

        const ssYY = data.map((d) => Math.pow(d.y - yBar, 2))
            .reduce((a, b) => a + b, 0.0);

        const ssXY = data.map((d) => (d.x - xBar) * (d.y - yBar))
            .reduce((a, b) => a + b, 0.0);

        const slope = ssXY / ssXX;
        const yIntercept = yBar - (xBar * slope);
        const xIntercept = -(yIntercept / slope);
        const rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

        return {
            slope, xIntercept, yIntercept, rSquare, y: function (x) {
                return x * slope + yIntercept
            }
        };
    }

    linkWithTree(treeSVG) {
        const self = this;

        const mouseover = function(d) {
            select(self.svg).select(`#${d.node.id}`).select(`.node-shape`).attr("r", self.settings.hoverNodeRadius);
            select(treeSVG).select(`#${d.node.id}`).select(`.node-shape`).attr("r", self.settings.hoverNodeRadius);
        };
        const mouseout = function(d) {
            select(self.svg).select(`#${d.node.id}`).select(`.node-shape`).attr("r", self.settings.nodeRadius);
            select(treeSVG).select(`#${d.node.id}`).select(`.node-shape`).attr("r", self.settings.nodeRadius);
        };
        const clicked = function(d) {
            // toggle isSelected
            let tip = d;
            if (d.node) {
                tip = d.node;
            }
            tip.isSelected = !tip.isSelected;

            const node1 = select(self.svg).select(`#${tip.id}`).select(`.node-shape`);
            const node2 = select(treeSVG).select(`#${tip.id}`).select(`.node-shape`);

            if (tip.isSelected) {
                node1.attr("class", "node-shape selected");
                node2.attr("class", "node-shape selected");
            } else {
                node1.attr("class", "node-shape unselected");
                node2.attr("class", "node-shape unselected");
            }

            self.update();
        };

        const tips = select(this.svg).selectAll(`.external-node`).selectAll(`.node-shape`);
        tips.on("mouseover", mouseover);
        tips.on("mouseout", mouseout);
        tips.on("click", clicked);

        const points = select(treeSVG).selectAll(`.node-shape`);
        points.on("mouseover", mouseover);
        points.on("mouseout", mouseout);
        points.on("click", clicked);
    }
}


