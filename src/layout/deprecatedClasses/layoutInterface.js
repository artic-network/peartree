"use strict";
import {format,curveStepBefore,max,min,line,mean,scaleLinear,curveLinear} from "d3";
import {Type} from "../../tree";
import uuid from "uuid";

/** @module layout */

export const  VertexStyle = {
    INCLUDED:Symbol("INCLUDED"),// Only included nodes are sent to the figtree class
    IGNORED:Symbol('IGNORED'), // Ignored nodes are just that ignored in everyway
    HIDDEN:Symbol("HIDDEN"), // The only difference between hidden and included nodes is that hidden nodes are not sent to the figtree class
    MASKED:Symbol("MASKED") // Masked nodes have an x and y coordinate but are then ignored. They don't count towards their parent's x and y and are not visualized.
}

/**
 * The interface for the layout class this defines the api
 *
 */
export class layoutInterface {

    /**
     * The constructor
     * @param tree
     * @param settings
     */


    /**
     * The layout function is called to make the edges, vertrices, and cartoons that make up the graph and set or update
     * their positions on a custom x and y scale. It also should update the _horizontialScale, the _veriticalRange so that
     * these positions can be converted to a [0,1] scale to be consumed by the figtree class.
     * 
     */
    layout() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A getter to return the horizontal range spanned by the vertices in the graph
     */
    get horizontalDomain() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }
    /**
     * A getter to return the vertical range spanned by the vertices in the graph
     */
    get verticalDomain() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }


    /**
     * A setter for setting the branchScale factor. Should trigger and update
     * @param value
     */
    set branchScale(value){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")

    }

    /**
     * A getter for the branchScaling factor
     * @return {number}
     */
    get branchScale(){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * Sets the annotation to use as the node labels for internal nodes. It should trigger and update.
     *
     * @param annotationName
     */
    set internalNodeLabelAnnotationName(annotationName) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")

    }

    /**
     * Getter for internal node annotation name
     * @return {*}
     */
    get internalNodeLabelAnnotationName() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }



    /**
     * Sets the annotation to use as the node labels for external nodes.It should trigger and update
     *
     * @param annotationName
     */
    set externalNodeLabelAnnotationName(annotationName) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")

    }

    /**
     * getter for external node label name.
     * @return {*}
     */
    get externalNodeLabelAnnotationName() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * Sets the annotation to use as the branch labels. It should trigger an update
     *
     * @param annotationName
     */
    set branchLabelAnnotationName(annotationName) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }
    get branchLabelAnnotationName() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * Updates the tree when it has changed
     */
    update() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }
    /**
     * A utility function for rotating a node
     * @returns {*}
     */
    rotate() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function for ordering a subtree with increasing tip density
     * @returns {orderIncreasing}
     */
    orderIncreasing() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function for ordering a subtree with decreasing tip density
     * @returns {orderIncreasing}
     */
    orderDecreasing() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function for rerooting the tree
     * @returns {reroot}
     */
    reroot() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function to mark a clade as a triangle cartoon
     * @param vertex
     */
    cartoon(vertex) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utitlity function to collapse a clade into a single branch and tip.
     * @param vertex
     */
    collapse(vertex) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function to mask a node so that it's vertex will be assigned an x and y but these values will not be used
     * to calculate the position of parent nodes.
     * @param node
     */
    maskNode(node){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function to hide a node so that it is not sent to the figtree class for visualization.
     * @param node
     */
    hideNode(node){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function to ignore a node so that it does not get an x or y coordinate and is not sent to figtree.js
     * for visualization.
     * @param node
     */
    ignoreNode(node){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")

    }

    /**
     * A unitlity function to mark a node as included. This is the default.
     * @param node
     */
    includeNode(node){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function that will return a HTML string about the node and its
     * annotations. Can be used with the addLabels() method.
     *
     * @param node
     * @returns {string}
     */
    nodeInfo(node) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A getter function that updates the layout if needed and then returns edges whose target node is "included"
     * @return {T[]}
     */
    get edges() {
        if (!this.layoutKnown) {
            this.layout();
        }
        return this._edges.filter(e => e.v1.visibility===VertexStyle.INCLUDED);
    }

    /**
     * A getter function that updates the layout if needed and returns included vertices.
     * @return {T[]}
     */
    get vertices() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A getter function that updates the layout if needed, determines the most ancestral cartoons, hides the appropriate vertices
     * and then returns a array of  cartoon objects defined as {vertices[{x:,y}...{x:,y:}], deprecatedClasses:[string,...],id:string,node:NODE:starting node }
     * @return {[]}
     */
    get cartoons() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function that updates the layout if needed then returns the nodeMap.
     * @return {*|Map|Map|Map|Map<any, any>}
     */
    get nodeMap() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A utility function that updates the layout if needed then returns the edgeMap.
     * @return {*|Map|Map|Map|Map<any, any>}
     */
    get edgeMap() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }


    /**
     * sets the initial Y value for the first node returned from the getTreeNodes().
     * @return {number}
     */
    setInitialY() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * Set the y position of a vertex and return the Y position. This function is called on each node in the order returns from the getTreeNodes() method.
     * The currentY represent the Y position of the previous node at each iteration. These y values will be converted to pixels by the figtree instance.
     * range.
     * @param vertex
     * @param currentY
     * @return {number}
     */
    setYPosition(vertex, currentY) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }
    /**
     * sets the initial x value for the first node returned from the getTreeNodes().
     * @return {number}
     */
    setInitialX() {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }
    /**
     * Set the x position of a vertex and return the X position. This function is called on each node in the order returns from the getTreeNodes() method.
     * The currentX represent the x position of the previous node at each iteration. These x values will be mapped to a [0,1]
     * range. In the 'normal' left to right tree this method would ignore the currentX and set the x based on the horizontal scale.
     * @param vertex
     * @param currentX
     * @return {number}
     */
    setXPosition(vertex, currentX) {
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }


    /**
     * A private method which returns the nodes of the tree in the order in which they will be assigned Y and X coordinates.
     * This function is passed to getTreeNodes() methods which filters out the ignoredNodes. This funciton should be overwritten
     * but only called if the ignored nodes are needed.
     * @return {Array[]}
     */
    _getTreeNodes(){
    throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A helper function that returns an array of verticies corresponding to a vertex's node's children. This method is useful
     * because it handles the logic determining whether or not a vertex is included, hidden, masked ect.
     *
     * @param vertex
     * @return {*}
     */
    getChildVertices(vertex){
        return vertex.node.children.map(child=>this._nodeMap.get(child)).filter(child=>child.visibility===VertexStyle.INCLUDED||child.visibility===VertexStyle.HIDDEN);
    }


    /**
     * A utility function that replaces the aspects of the settins provided here then calls update.
     * @param newSettings
     */
    updateSettings(newSettings){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }

    /**
     * A method that updates a layout's layout function. middlewares should take one parameter which will be this layout.
     * They can then use this parameter to access the methods and state of the layout.
     * @param middlewares - function to be called after the original layout function
     * @return {layout}
     */
    extendLayout(...middlewares){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")
    }
    /**
     * A method that subscribes the function to be called when the layout updates.
     * @param func - function to be called when the layout updates
     */
    subscribeCallback(func){
        throw  new Error("Don't call this method from the parent layoutInterface class. It must be implemented in the child class")

    }


}


