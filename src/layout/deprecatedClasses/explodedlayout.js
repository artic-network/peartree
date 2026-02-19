"use strict";

/** @module layout */

import { AbstractLayout,VertexStyle } from "./abstractLayout.js";
import {min,mean} from "d3";

/**
 * The TransmissionLayout class
 * Only works for 'up' directions
 *
 */
export class ExplodedLayout extends AbstractLayout {

    static DEFAULT_SETTINGS() {
        return {
            groupingAnnotation:"host",
            direction:"up",
            interGroupGap:10,
            intraGroupGap:5,
            groupOrdering:(a,b)=>a<b?-1:1,
        }
    };

    /**
     * The constructor.
     * @param tree
     * @param settings
     */
    constructor(tree, settings = {}) {

        super(tree, {...ExplodedLayout.DEFAULT_SETTINGS(), ...settings});
    }


    _getTreeNodes() {
        // order first by grouping annotation and then by postorder
        const postOrderNodes = [...this.tree.postorder()];

        // sort by location and then by post order order but we want all import/export banches to be last
        return([...this.tree.postorder()].sort((a,b)=>{
            const aGroup = a.annotations[this.settings.groupingAnnotation];
            const bGroup = b.annotations[this.settings.groupingAnnotation];
            if(aGroup===bGroup){
                return postOrderNodes.indexOf(a)-postOrderNodes.indexOf(b);
            }else{
                    return this.settings.groupOrdering(aGroup,bGroup)
                }
        }))


    }

    setYPosition(vertex, currentY) {
        // check if there are children that that are in the same group and set position to mean
        // if do something else
        if(currentY===this.setInitialY()) {
            this._currentGroup = vertex.node.annotations[this.settings.groupingAnnotation];
        }
       // First if this isn't tip like
        if (vertex.node.children&&(vertex.node.children.length>1||vertex.node.annotations[this.settings.groupingAnnotation]!==vertex.node.parent.annotations[this.settings.groupingAnnotation])) {
            const vertexChildren = this.getChildVertices(vertex);
            vertex.y = mean(vertexChildren,(child) => child.y);
            if(vertex.node.parent){
                if(vertex.node.annotations[this.settings.groupingAnnotation]!==vertex.node.parent.annotations[this.settings.groupingAnnotation]){
                    this._newIntraGroupNext=true;
                }
            }

        } else {

        //It's a tip or tip-like
            if(vertex.node.annotations[this.settings.groupingAnnotation]!==this._currentGroup){
                //This the the first time in the new group
                currentY+=this.settings.interGroupGap;
                //Reset this flag
                this._newIntraGroupNext = false;
            }
            else if(this._newIntraGroupNext){
                //It's a tip in a new circulation
                currentY+=this.settings.intraGroupGap;
                this._newIntraGroupNext = false;
            }else{
                //Just the same ciruclation
                currentY += 1;
            }
            this._currentGroup= vertex.node.annotations[this.settings.groupingAnnotation];
            vertex.y = currentY;
        }

        return currentY;
    }

}




/*
 * Private methods, called by the class using the <function>.call(this) function.
 */

