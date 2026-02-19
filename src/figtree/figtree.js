"use strict";
import {select,easeCubic,scaleLinear} from "d3";
import uuid from "uuid";
import { mergeDeep} from "../utilities";
import 'd3-selection-multi';
import {GeoLayout} from "../layout/deprecatedClasses/geoLayout";
import {BaubleManager} from "../features/baubleManager"
import p from "../privateConstants.js"
import extent from "d3-array/src/extent";

/** @module figtree */


/**
 * The FigTree class
 *
 * A class that takes a tree and draws it into the the given SVG root element. Has a range of methods
 * for adding interactivity to the tree (e.g., mouse-over labels, rotating nodes and rerooting on branches).
 * The tree is updated with animated transitions.
 */
export class FigTree {

    static DEFAULT_SETTINGS() {
        return {
            xScale: {
                scale: scaleLinear,
                revisions: {
                    origin: null,
                    reverseAxis: false,
                    branchScale: 1,
                    offset: 0,
                    hedge: 0
                }
            },
            yScale: {
                scale: scaleLinear,
                revisions: {
                    origin: null,
                    reverseAxis: false,
                    offset: 0,
                    hedge: 0
                }
            },
        }
    }

    /**
     * The constructor.
     * @param {svg} svg -  the html svg that will hold the figure - required
     * @param {Object} margins -  the space within the svg along the border that will not be used to draw the tree. Axis will be placed in this space. Optional in constructor.
     * @param {number} margins.top - the distance from the top
     * @param {number} margins.bottom - the distance from the bottom
     * @param {number} margins.left - the distance from the left
     * @param {number} margins.right - the distance from the right
     * @param {tree} tree - the tree. optional in the constructor
     * @param {Object} [settings={}] - Settings for the figure. Settings provided in part will not affect defaults not explicitly mentioned
     * @param {Object} settings.xScale - Settings specific for the x scale of the figure
     * @param {function} [settings.xScale.scale=d3.scaleLinear] - A d3 scale for the x dimension
     * @param {Object} settings.xScale.revisions - Any updates or revisions to be made to the x scale set by the layout
     * @param {number} [settings.xScale.revisions.origin=null] - An optional value for specifying the right most edge of the plot.
     * @param {boolean} [settings.xScale.revisions.reverseAxis=false] - Should the x axis decrease from right to left? (default false => number increase from height 0 as we move right to left)
     * @param {number} [settings.xScale.revisions.branchScale=1] - Factor to scale the branchlengths by
     * @param {number} [settings.xScale.revisions.offset=0] - Space to add between the origin and right-most vertex
     * @param {number} [settings.xScale.revisions.hedge = 0] - Space to add between the left edge of the plot and the left most vertex.
     * @param {Object} settings.yScale - Settings specific for the y scale of the figure
     * @param {function} [settings.yScale.scale=d3.scaleLinear] - A d3 scale for the y dimension
     * @param {number} width - an option to specify the width of the svg. This will be used in making the scales. If not provided the width is taken from the svg
     * @param {number} height - an option to specify the height of the svg. This will be used in making the scales. If not provided the height is taken from the svg

     */
    constructor(svg=null, margins={top:10,bottom:60,left:30,right:60},tree=null, settings = {}) {
        // this[p.layout] = layout;
        this._margins = margins;

        this.settings = mergeDeep(FigTree.DEFAULT_SETTINGS(),settings);
        this._transitions=  {
            transitionDuration: 500,
                transitionEase: easeCubic
        };
        this[p.svg]=svg;
        this[p.tree] = tree;
        this[p.tree].subscribeCallback( () => {
                this.update();
            });
        this.setupSVG();
        this.axes=[];
        this._features=[];

        this.nodeManager = new BaubleManager()
            .class("node")
            .layer("nodes-layer")
            .figure(this);


        this.nodeBackgroundManager = new BaubleManager()
            .class("node-background")
            .layer("node-backgrounds-layer")
            .figure(this);

        this.branchManager = new BaubleManager()
            .class("branch")
            .layer("branches-layer")
            .figure(this);
        // this.setupUpdaters();
        return this;
    }

    transitions(t=null){
        if(t){
            this._transitions={...this._transitions,...t};
        }else{
            return this._transitions;
        }
    }
    margins(m=null){
        if(m!==null){
            this._margins = {...this._margins,...m}
            return this;
        }else{
            return this._margins
        }
    }
    /**
     * An instance method that makes place the svg object in the page. Without calling this method the figure will not be drawn
     * @return {FigTree}
     */
    setupSVG(){

        this.svgId = `g-${uuid.v4()}`;
        select(this[p.svg]).select(`#${this.svgId}`).remove();

        // add a group which will contain the new tree
        select(this[p.svg]).append("g")
            .attr("id",this.svgId)
            .attr("transform",`translate(${this._margins.left},${this._margins.top})`);

        //to selecting every time
        this.svgSelection = select(this[p.svg]).select(`#${this.svgId}`);
        this.svgSelection.append("g").attr("class","annotation-layer");
        this.svgSelection.append("g").attr("class", "axes-layer");
        this.svgSelection.append("g").attr("class", "cartoon-layer");

        this.svgSelection.append("g").attr("class", "branches-layer");
        this.svgSelection.append("g").attr("class", "node-backgrounds-layer");
        this.svgSelection.append("g").attr("class", "nodes-layer");



    }
    /**
     * Updates the figure when the tree has changed
     */
    update() {
        const {vertices,edges} = this[p.layout](this[p.tree]);

        select(`#${this.svgId}`)
            .attr("transform",`translate(${this._margins.left},${this._margins.top})`);

        this.setUpScales(vertices,edges);

        this.updateNodePositions(vertices);
        this.updateBranchPositions(edges);

        for(const feature of this._features){
            feature.update({vertices,edges})
        }
        return this;

    }

    /**
     * A helper function that sets the positions of the node and nodebackground groups in the svg and then calls update
     * functions of the node and node background elements.
     * @param vertices
     */
    updateNodePositions(vertices) {
       this.nodeManager.update(vertices);
        this.nodeBackgroundManager.update(vertices);
    }

    /**
     * A helper function that sets the postions of the branch groups and calls the update functions of the branch elements.
     * @param edges
     */
    updateBranchPositions(edges){
        this.branchManager.update(edges)
    }

    /**
     * Adds an element to the node update cycle. The element's update method will be called for each node selection.
     * Used to insert the visible elements mapped to the nodes
     * @param elements
     * @return {FigTree}
     */
    nodes(...elements){
        for(const element of elements){
            this.nodeManager.element(element);
        }
        this.update();
        return this;
    }

    /**
     * Adds an element to the branch update cycle.The element's update method will be called for each branch selection.
     * Used to insert the visible elements mapped to the nodes
     * @param elements
     * @return {FigTree}
     */
    branches(...elements){
        for(const element of elements){
            this.branchManager.element(element);
        }
        this.update();
        return this;
    }
    /**
     * Adds an element to the node background update cycle. The element's update method will be called for each node selection.
     * Used to insert the visible elements mapped to the nodes
     * @param elements
     * @return {FigTree}
     */
    nodeBackgrounds(...elements){
        for(const element of elements){
            this.nodeBackgroundManager.element(element);
        }
        this.nodeBackgroundManager.update();
        return this;
    }

    setUpScales(vertices,edges){
            let width,height;
            if(Object.keys(this.settings).indexOf("width")>-1){
                width =this.settings.width;
            }else{
                width = this[p.svg].getBoundingClientRect().width;
            }
            if(Object.keys(this.settings).indexOf("height")>-1){
                height =this.settings.height;
            }else{
                height = this[p.svg].getBoundingClientRect().height;
            }

            // create the scales
            let xScale,yScale;
            let projection=null;

            if(this.layout instanceof GeoLayout){
                xScale = scaleLinear();
                yScale = scaleLinear();
                projection = this.layout.projection;
            }
            else{
                const xdomain = extent(vertices.map(d=>d.x).concat(edges.reduce((acc,e)=> acc.concat([e.v1.x,e.v0.x]),[])));
                // almost always the same except when the trendline is added as an edge without vertices
                const ydomain =  extent(vertices.map(d=>d.y).concat(edges.reduce((acc,e)=>acc.concat([e.v1.y,e.v0.y]),[])));

                xScale = this.settings.xScale.scale()
                    .domain(xdomain)
                    .range([0, width - this._margins.right-this._margins.left]);

                yScale = this.settings.yScale.scale()
                    .domain(ydomain)
                    .range([height -this._margins.bottom-this._margins.top,0]);
            }

        this.scales = {x:xScale, y:yScale, width, height, projection};
    }



    /**
     * Registers some text to appear in a popup box when the mouse hovers over the selection.
     *
     * @param selection
     * @param text
     */
    addToolTip(selection, text) {
        this.svgSelection.selectAll(selection).on("mouseover",
            function (selected) {
                let tooltip = document.getElementById("tooltip");
                if (typeof text === typeof "") {
                    tooltip.innerHTML = text;
                } else {
                    tooltip.innerHTML = text(selected.node);
                }
                tooltip.style.display = "block";
                tooltip.style.left =event.pageX + 10 + "px";
                tooltip.style.top = event.pageY + 10 + "px";
            }
        );
        this.svgSelection.selectAll(selection).on("mouseout", function () {
            let tooltip = document.getElementById("tooltip");
            tooltip.style.display = "none";
        });
        return this;

    }


// setters and getters
    /**
     * Get or set SVG
     * @param svg - optional parameter.
     * @return {FigTree|svg}
     */
    svg(svg=null){
        if(svg===null){
            return this[p.svg]
        }
        else {
            this[p.svg] = svg;
            return this;
        }
        }

    /**
     * Get or set tree
     * @param tree
     * @return {FigTree|Tree}
     */
    tree(tree=null){
        if(tree===null){
            return this[p.tree]
        }else{
            this[p.tree] = tree;
            this[p.tree].subscribeCallback( () => {
                this.update();
            });
            this.update();
            return this;
        }
    }

    /**
     * Get or set layout function
     * @param layout
     * @return {FigTree|*}
     */
    layout(layout=null){
        if(layout===null){
            return this[p.layout]
        }else{
            this[p.layout] = layout;
            this.update();
            return this;
        }
    }

    /**
     * Add a feature to the update cycle. Also sets the figure of the feature to this figtree instance
     * The feature's update cycle will be called
     * with an an object containing the vertices and edges.
     * @param feature
     * @return {FigTree}
     */
    feature(f){
        f.figure(this);
        this._features = this._features.concat(f);
        this.update();
        return this;
    }
    // axis(){
    //     const a = axis();
    //     this.feature(a);
    //     return a;
    // }
    // scaleBar(){
    //     const sb=scaleBar();
    //     this.feature(sb);
    //     return sb;
    // }
    // legend(){
    //     const l = legend();
    //     this.feature(l);
    //     return l;
    // }
}
