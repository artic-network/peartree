import {makeVertexFromNode} from "./layoutHelpers";
import {max, min} from "d3";

export const rootToTipVertices=(tree)=>{


    if(!tree.annotations.date){
        console.warn("tree must be annotated with dates to use the root to tip layout")
        return [];
    }
    return tree.externalNodes.map(n=>({...makeVertexFromNode(n),x:n.annotations.date,y:n.divergence}));
}
// TODO add edges from tips to parent on trendline to compare outliers.
const makeTrendlineEdge=predicate=>(vertices)=>{

    const usedVertices = vertices.filter(predicate);
    const regression  = leastSquares(usedVertices);

    let x1 = min(vertices, d => d.x);
    let x2 = max(vertices, d => d.x);
    let y1 = 0.0;
    let y2 = max(usedVertices, d => d.y);
    if (usedVertices.length > 1 && regression.slope > 0.0) {
        x1 = regression.xIntercept;
        y2 =regression.y(x2)
    }else if(usedVertices> 1 && regression.slope < 0.0 ){
        x2 = regression.xIntercept;
        y1= regression.y(x1);
        y2=0;
    }

    const startPoint = {key:"startPoint",x:x1,y:y1};
    const endPoint = {key:"endPoint",x:x2,y:y2};

    return {edges:[{
        v0: startPoint,
        v1: endPoint,
        key: "trendline",
        id:"trendline",
        classes:["trendline"],
        x:startPoint.x,
        y:endPoint.y,
        textLabel:{ // TODO update this for regression labeling
            dx:[endPoint.x,startPoint.x],
            dy: -6,
            alignmentBaseline: "hanging",
            textAnchor:"middle",
        },
    }],regression:regression}
};


export const rootToTipLayout = (predicate =()=>true) => tree =>{
    const vertices = rootToTipVertices(tree);
    const {edges,regression} = makeTrendlineEdge(predicate)(vertices);
    return {vertices,edges,regression};
};
/**
 * returns slope, intercept and r-square of the line
 * @param data
 * @returns {{slope: number, xIntercept: number, yIntercept: number, rSquare: number, y: (function(*): number)}}
 */
function leastSquares(data) {

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