"use strict";

/** @module layout */

import {mean,extent} from "d3";
import {AbstractLayout, updateVerticesY, VertexStyle} from "./abstractLayout";
/** @module layout */


export const Direction = {
    UP : Symbol("UP"),
    DOWN : Symbol("DOWN")
};

/**
 * The TransmissionLayout class
 * up orders the tree in increasing node density and puts transmission up
 * down orders tree in decreasing node density and puts the transmissions down
 *
 */
export class TransmissionLayout extends AbstractLayout {

    static DEFAULT_SETTINGS() {
        return {
            groupingAnnotation:"host",
            direction:"up",
            groupGap: 5,
        }
    };

    /**
     * The constructor.
     * @param tree
     * @param settings
     */
    constructor(tree, settings = {}) {
        // Rotate the tree so that jumps are always on top/bottom depending on settings
        // defined here so we can use the groupingAnnotation key
        super(tree, {...TransmissionLayout.DEFAULT_SETTINGS(), ...settings});
        this.extendLayout(transmissionMiddleWare)
    }

    setYPosition(vertex, currentY) {
            const includedInVertical = !vertex.node.children;
            if(!includedInVertical){
                const vertexChildren = this.getChildVertices(vertex);
                vertex.y = mean(vertexChildren,(child) => child.y);
            }
            else{
                currentY += 1;
                vertex.y = currentY;
            }
            return currentY;
        }
        _getTreeNodes() {

            // this.tree._order(orderTreeNodes.bind(this));

            return [...this.tree.postorder()]
        }
}

function transmissionMiddleWare(context){
    // If direction is up start at bottom if direction is down start at top
    let sorting =(a,b)=>-1;
    let gap = context.settings.groupGap;
    if(context.settings.direction.toLowerCase()==="up"){
        sorting = (a,b) => a.y-b.y;
        gap*=-1;
    }else if(context.settings.direction.toLowerCase()==="down"){
        sorting=(a,b)=>b.y-a.y;
    }
    context._vertices.sort(sorting)
        .forEach(vertex=>{
            //We don't touch the root
            if(vertex.node.parent){
                //Is there a state change
                if(vertex.node.annotations[context.settings.groupingAnnotation]!==vertex.node.parent.annotations[context.settings.groupingAnnotation]){
                    //Get descendent vertices
                    const vertices =[...context.tree.postorder(vertex.node)].map(n=>context._nodeMap.get(n));
                        updateVerticesY.call(context,gap,...vertices);
                }
            }
        });

    context._verticalRange =extent(context._vertices,v=>v.y);

}




