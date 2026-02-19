import {AbstractLayout, makeEdgesFromNodes, makeVerticesFromNodes, setupEdge} from "./abstractLayout";
import {min} from "d3"
export class EqualDaylightLayout extends AbstractLayout {
    constructor(tree, settings = {}) {
        super(tree, {fixedOrder: true, ...settings});

        // an ordering of the nodes so we can maintain the layout
        if (this.settings.fixedOrder) {
            this.tipRank = [...this.traverseFromTip((this.settings.startingNode ? this.settings.startingNode : this.tree.externalNodes[0]))].filter(n => !n.children);
        }

        // The initial tree will be an equalangle tree. Every update after that will use the current state.


    }

}