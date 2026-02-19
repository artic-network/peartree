"use strict";

/** @module layout */

import { AbstractLayout } from "./abstractLayout.js";
import {mean} from "d3";
import {VertexStyle} from "./abstractLayout";

/**
 * The rectangular layout class
 *
 */
export class RectangularLayout extends AbstractLayout {


    /**
     * The constructor.
     * @param tree
     * @param settings
     */
    constructor(tree, settings = { }) {
        super(tree,settings);

    }

    _getTreeNodes() {
        return [...this.tree.postorder()]
    }

    setYPosition(vertex, currentY) {

        const includedInVertical = !vertex.node.children;
        if(!includedInVertical) {

            const vertexChildren = this.getChildVertices(vertex);
            vertex.y = mean(vertexChildren, (child) => child.y);
        }else{
            currentY += 1;
            vertex.y = currentY;
        }
        return currentY;
    }





}



