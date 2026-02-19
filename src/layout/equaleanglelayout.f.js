import {mean, min} from "d3-array";
import {layoutFactory, makeVertexFromNode} from "./layoutHelpers";

//TODO doesn't layout nodes properly or hold position

function getRelatives(node){return [(node.parent&&node.parent)].concat((node.children&&node.children)).filter(n=>n)};// to remove null


function * pseudoRerootPreorder(node, visited=[]) {
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


export function equalAngleVertices(startNode=null){


    let tipRank;
    if(startNode){
        tipRank=[...pseudoRerootPreorder(startNode,[])].filter(n=>!n.children)
    }
    return function layout(tree){

        startNode =startNode?startNode:tree.rootNode;

        const numberOfTips= tree.externalNodes.length;
        const rPerTip = 2*Math.PI/numberOfTips;


        function *traverse(node,start,visited=[],parentVertex={x:0,y:0}){

            // for children pass start and end
            // set angle as middle
            // call children passing start and end
            if(node===startNode){
                const vertex = makeVertexFromNode(node);
                vertex.x =0;
                vertex.y =0;
                yield vertex;
            }
            let relatives = getRelatives(node).filter(n=>!visited.includes(n));
            // Node order is not really want we want we need to see past the interal nodes to the tips
            if(tipRank.length>0){
                relatives = relatives.sort((a,b)=>{

                    const aRank = min( [...pseudoRerootPreorder(a,[node])].filter(n=>!n.children).map(n=>tipRank.indexOf(n)));
                    const bRank = min ([...pseudoRerootPreorder(b,[node])].filter(n=>!n.children).map(n=>tipRank.indexOf(n)));
                    return bRank-aRank
                })
            }
            for(const relative of relatives){
                const vertex = makeVertexFromNode(relative);
                const allocation =[...pseudoRerootPreorder(relative,[...visited,...relatives])].filter(n=>!n.children).length*rPerTip;
                vertex.angle = (start+(start+allocation))/2;
                vertex.x = Math.sin(vertex.angle)* Math.abs(node.height-relative.height)+parentVertex.x;
                vertex.y = Math.cos(vertex.angle)* Math.abs(node.height-relative.height)+parentVertex.y;
                yield vertex;
                yield *traverse(relative,start,[node,...relatives],vertex);
                start+=allocation;
            }
        }

        return [...traverse(startNode,0)];
    }
}

/**
 * The equal angle layout. This function returns a layout function. It take and optional internal node, which if provided acts
 * as the starting node and fixes the order nodes are visited. This means the tree not update. The root position will
 * still change in response to rerooting.
 * @param startingNode optional
 * @return {function(*=): {vertices: *, edges: *}}
 */
export const equalAngleLayout=(startingNode) => layoutFactory(equalAngleVertices(startingNode));
