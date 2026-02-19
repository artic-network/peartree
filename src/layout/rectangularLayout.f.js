import {mean} from "d3";
import {makeEdges, makeVertexFromNode} from "./layoutHelpers";




export function rectangularVertices(tree){
    let currentY=0;
    const vertices=[];

    const traverse = function(node,siblingPositions=[]){
        const myChildrenPositions=[];

        if(node.children){

            for(const child of node.children){
                traverse(child,myChildrenPositions);
            }
            siblingPositions.push(mean(myChildrenPositions));
            const vertex = {...makeVertexFromNode(node),
                y:mean(myChildrenPositions),
                x:node.divergence};
            vertices.push(vertex);
        }else{
            currentY+=1;
            siblingPositions.push(currentY);
            const vertex = {...makeVertexFromNode(node), y:currentY, x:node.divergence};
            vertices.push(vertex);
        }
    };

    traverse(tree.rootNode);
    //slow!
    return vertices;
}



const layoutFactory=makeVertices=>tree=>{
    const vertices = makeVertices(tree);
    const edges = makeEdges(vertices);
    return {vertices,edges}
};

export const rectangularLayout = layoutFactory(rectangularVertices);