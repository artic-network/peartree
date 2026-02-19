import {Branch} from "./branch";
import {mergeDeep} from "../utilities";
import {curveNatural,geoPath} from "d3";

export class GreatCircleBranchBauble extends Branch{
    static DEFAULT_SETTINGS() {
        return {
            curve: curveNatural,
            attrs: {"fill": d => "none", "stroke-width": d => "2", "stroke": d => "black"},
            vertexFilter: null,
            edgeFilter: () => true
        }


    }
    /**
     * The constructor takes a setting object. The keys of the setting object are determined by the type of element.
     *
     * @param {Object} settings
     * @param {function} [settings.curve=d3.curveNatural] - a d3 curve used to draw the edge
     * @param {function} [settings.edgeFilter=()=>true] - a function that is passed each edge. If it returns true then element applies to that vertex.
     * @param {Object} [settings._attrs={"fill": d => "none", "stroke-width": d => "2", "stroke": d => "black"}] - styling attributes. The keys should be the attribute string (stroke,fill ect) and entries are function that are called on each vertex. These can be overwritten by css.
     *  @param {Object} [settings.styles={}] - styling attributes. The keys should be the attribute string (stroke,fill ect) and entries are function that are called on each vertex. These overwrite css.
     */
    constructor(settings={}) {
        super(mergeDeep(GreatCircleBranchBauble.DEFAULT_SETTINGS(), settings));
    }
//TODO
    branchPathGenerator({scales,curveRadius,curve}) {
        const _geoPath = geoPath(scales.projection);

        const branchPath = (e, i) => {
            // get og line
           const geoLine =  {
                "type": "LineString",
                "coordinates": [
                [e.v0.x,  e.v0.y],
                    [ e.v1.x,  e.v1.y]]
            };

           console.log(_geoPath(geoLine));
           console.log(transformedLine(_geoPath(geoLine)))

            return transformedLine(_geoPath(geoLine))

        };
        return branchPath;
    }



}

//TODO fix this hack that only takes M and L

const transformedLine=(string)=>{
    const parsedString = string.split(/\s*('[^']+'|"[^"]+"|M|L|,)\s*/);
    let currentValues = [0,0];
    const startingPoint = [];
    const newString = [];
    let currentPos = 0;
    for(const token of parsedString.filter(t=>t.length>0)){
        if(token==="M"|| token==="L"||token===","){
            newString.push(token.toLowerCase())
        }else{
            const number = parseFloat(token);
            if(currentValues[currentPos]===0){
                newString.push(0);
                startingPoint.push(number)
                currentValues[currentPos]=number;
                currentPos=Math.abs(currentPos-1);
            }else{
                newString.push(number- currentValues[currentPos]);
                currentValues[currentPos]=number;
                currentPos=Math.abs(currentPos-1);
            }
        }
    }
    // now fix to handel how the branch is transformed
    newString[3]=startingPoint[1]-currentValues[1]
    return newString.join("");
}