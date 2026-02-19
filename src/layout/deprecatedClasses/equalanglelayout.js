import {
    AbstractLayout,
    getMostAncestralCartoons,
    makeEdgesFromNodes,
    makeVerticesFromNodes,
    setupEdge
} from "./abstractLayout";
import {min} from "d3"
/** @module layout */

export class EqualAngleLayout extends AbstractLayout {


    /**
     * The constructor.
     * @param tree
     * @param settings
     */
    constructor(tree, settings = {}) {
        super(tree, {fixedOrder:true,...settings});

        // an ordering of the nodes so we can maintain the layout
        if(this.settings.fixedOrder){
            this.tipRank= [...this.traverseFromTip((this.settings.startingNode ? this.settings.startingNode : this.tree.externalNodes[0]))].filter(n=>!n.children);
        }
    }


    _getTreeNodes() {
        this.startingNode = this.settings.startingNode ? this.settings.startingNode : this.tree.externalNodes[0];
        this.nodeOrder= [...this.traverseFromTip(this.startingNode)];
        return this.nodeOrder;
    }

    setYPosition(vertex, currentY) {
        const node = vertex.node;
        if (vertex.node === this.startingNode) {
            vertex.y = 0;
            vertex.angle = 0;
            vertex.allocatedRadians = [0, 2 * Math.PI];
        } else {
            // set y off of allocated angle
            const pseudoParent = this.getPseudoParent(node);
            const pseudoLength = Math.abs(pseudoParent.height-node.height);
            const deltaY = Math.sin(vertex.angle) * pseudoLength;
            vertex.y = this._nodeMap.get(pseudoParent).y + deltaY

        }
        //setup angles for children
        const pseudoChildren = this.getPseudoChildren(node);
        if (pseudoChildren) {
            // const subtrees = [...node.children, (node.parent&& node.parent)].filter(s=>s);

            const totalTips = this.tree.externalNodes.length;
            let totalRadians = vertex.allocatedRadians[0];
            pseudoChildren.forEach(child => {

                const tips = [...this.traverseFromTip(child,[node])].filter(n => !n.children).length;

                const r = 2 * Math.PI * tips / totalTips;
                const angle = totalRadians + r / 2;
                const allocatedRadians = [totalRadians, totalRadians + r];
                totalRadians += r;
                // if (s !== node.parent) {
                const subtreeVertex = this._nodeMap.get(child);
                subtreeVertex.angle = angle;
                subtreeVertex.allocatedRadians = allocatedRadians;
                // }
            });
        }

        return 0
    }

    setXPosition(vertex, currentX) {
        const node = vertex.node;
        if (vertex.node === this.startingNode) {
            vertex.x = 0;
        } else {
            // set y off of allocated angle
            const pseudoParent = this.getPseudoParent(node);
            const pseudoLength = Math.abs(pseudoParent.height-node.height);

            const deltaX = Math.cos(vertex.angle) *pseudoLength;
            vertex.x = this._nodeMap.get(pseudoParent).x + deltaX
        }
    }

    setInitialX() {
        return 0;
    }

    setInitialY() {
        return 0;
    }

    * traverseFromTip(node,visited=[]) {
        const self = this;
        const traverse = function* (node) {
            visited.push(node);
            yield node;
            const relatives = [(node.parent&&node.parent)].concat((node.children&&node.children)).filter(n=>n);// to remove null
            let pseudoChildren = relatives.filter(n => !visited.includes(n));
            if (pseudoChildren) {
                if(self.tipRank){
                    pseudoChildren = pseudoChildren.sort((a,b)=>{

                       const aRank = min( [...self.pseudoRerootPreorder(a,[node])].filter(n=>!n.children).map(n=>self.tipRank.indexOf(n)));
                       const bRank = min ([...self.pseudoRerootPreorder(b,[node])].filter(n=>!n.children).map(n=>self.tipRank.indexOf(n)));
                       return bRank-aRank
                    })
                }
                for (const child of pseudoChildren) {
                    yield* traverse(child);
                }

            }
        };
        yield* traverse(node);
    }

    * pseudoRerootPreorder(node, visited=[]) {
        const self = this;
        const traverse = function* (node) {
            visited.push(node);
            yield node;
            const relatives = [(node.parent&&node.parent)].concat((node.children&&node.children)).filter(n=>n);// to remove null
            let pseudoChildren = relatives.filter(n => !visited.includes(n));
            if (pseudoChildren) {
                for (const child of pseudoChildren) {
                    yield* traverse(child);
                }

            }
        };
        yield* traverse(node);
    }

    getPseudoParent(node){
        const relatives = [(node.parent&&node.parent)].concat((node.children&&node.children)).filter(n=>n); // to remove null
        // the parent will come before the node in question in the preoder traversal
        const pseudoParent =  this.nodeOrder.slice(0,this.nodeOrder.indexOf(node)).find(n=>relatives.includes(n));
        return pseudoParent
    }
    getPseudoChildren(node){
        const relatives = [(node.parent&&node.parent)].concat((node.children&&node.children)).filter(n=>n) ;// to remove null
        // the parent will come before the node in question in the preoder traversal
        const pseudoChildren=  this.nodeOrder.slice(this.nodeOrder.indexOf(node),this.nodeOrder.length).filter(n=>relatives.includes(n))
        return (pseudoChildren.length>0? pseudoChildren:null)
    }


    equalDaylight(node){
        // get the subtrees down each subtree
        const relatives = [(node.parent&&node.parent)].concat((node.children&&node.children)).filter(n=>n) ;// to remove null
        const nodeVertex = this._nodeMap.get(node);
        const nodesOfInterest = relatives.map(relative=>{

            const tips = [...this.traverseFromTip(relative),[node]].filter(n=>!n.children).sort((a,b)=>getAngle(nodeVertex,this._nodeMap.get(a)));
            return {rightMost:tips[0],leftMost:tips[tips.length-1]}
        })
        // get Angles
        // adjust subtree angles
        // Rest the x,y in the layout.




    }

}

/**
 * A function that gets the angle between vertices linked by the hypotenuse of a right triangle
 * @param vertex1
 * @param vertex2
 * @return {number}
 */
function getAngle(vertex1,vertex2){
    return Math.tan((vertex1.y-vertex2.y)/(vertex1.x-vertex2.x))
}

function getArcAngle(vertex1,vertex2,pivotVertex){
    return Math.PI - getAngle(pivotVertex,vertex1)-getAngle(pivotVertex,vertex2);

}