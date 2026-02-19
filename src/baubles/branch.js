import {curveStepBefore, line} from "d3-shape";
import {mergeDeep} from "../utilities";
import {Bauble} from "./bauble";
import {mouse, select} from "d3"
import uuid from "uuid"
import p from "../privateConstants";
import {BaubleManager} from "../features/baubleManager";
/** @module bauble */

export class Branch extends Bauble {
    static DEFAULT_SETTINGS() {
        return {
            curveRadius: 0,
            attrs: {"fill":"none","stroke":"black"},
        }

    }

    constructor() {
        super();
        this._curve=curveStepBefore;
        this._curveRadius = 0;
        this._attrs= {"fill":"none","stroke":"black"};
    }


    update(selection) {
        this.branchPath =this.branchPathGenerator();
        if(selection==null&&!this.selection){
            return
        }
        if(selection){
            this.selection=selection;
        }
        const self=this;
        return selection
            .selectAll(`.${this.id}`)
            .data(d => [d].filter(this.filter()),d=>this.id)
            .join(
                enter => enter
                    .append("path")
                    .attr("d", (v1,i) => this.branchPath(v1,i))
                    .attr("class", `branch-path ${this.id}`)
                    .attrs(this._attrs)
                    .each((d,i,n)=>{
                        const element = select(n[i]);
                        for( const [key,func] of Object.entries(this._interactions)){
                            element.on(key,(d,i,n)=>func(d,i,n))
                        }
                    }),
                update => update
                    .call(update => update.transition(d=>`u${uuid.v4()}`)
                        .duration(this.transitions().transitionDuration)
                        .ease(this.transitions().transitionEase)
                        .attr("d", (edge,i) => this.branchPath(edge,i))
                        .attrs(this._attrs)
                        .each((d,i,n)=>{
                            const element = select(n[i]);
                            for( const [key,func] of Object.entries(this._interactions)){
                                element.on(key,(d,i,n)=>func(d,i,n))
                            }
                        })
                    )
            )
    };

    branchPathGenerator() {
        const branchPath = (e, i) => {
            const branchLine = line()
                .x((v) => v.x)
                .y((v) => v.y)
                .curve(this._curve);
            const factor = e.v0.y - e.v1.y > 0 ? 1 : -1;
            const dontNeedCurve = e.v0.y - e.v1.y === 0 ? 0 : 1;
            const output = this._curveRadius > 0 ?
                branchLine(
                    [{x: 0, y: this.scales().y(e.v0.y) - this.scales().y(e.v1.y)},
                        {x: 0, y: dontNeedCurve * factor * this._curveRadius},
                        {x: 0 + dontNeedCurve * this._curveRadius, y: 0},
                        {x: this.scales().x(e.v1.x) - this.scales().x(e.v0.x), y: 0}
                    ]) :
                branchLine(
                    [{x: 0, y: this.scales().y(e.v0.y) - this.scales().y(e.v1.y)},
                        {x: this.scales().x(e.v1.x ) - this.scales().x(e.v0.x), y: 0}
                    ]);
            return (output)

        };
        return branchPath;
    }

    curve(curve=null){
        if(curve){
            this._curve = curve;
            return this;
        }else{
            return this._curve;
        }
    }
    curveRadius(curveRadius=null){
        if(curveRadius){
            this._curveRadius = curveRadius;
            return this;
        }else{
            return this._curveRadius;
        }
    }

    hilightOnHover(strokeWidth = null) {
        let oldStrokeWidth;
        super.on("mouseenter",
            (d, i,n) => {
                if(strokeWidth) {
                    if (!this._attrs["stroke-width"]) {
                        this._attrs["stroke-width"] = this._attrs["stroke-width"];
                    }
                    oldStrokeWidth=this._attrs["stroke-width"];
                    this.attr("r", strokeWidth);
                }
                const parent = select(n[i]).node().parentNode;
                this.update(select(parent));
                select(parent).classed("hovered",true)
                    .raise();
                if(strokeWidth){
                    this.attr("r", oldStrokeWidth);
                }
            });
        super.on("mouseleave",
            (d,i,n) => {
                const parent = select(n[i]).node().parentNode;
                select(parent).classed("hovered",false);
                this.update(select(parent));
            });
        return this;
    }

    /**
     * Helper function to reroot tree at the clicked position.
     * @param distance - how should the distance along the branch be calculated (x - just x distance, euclidean - euclidean)
     * @return {Branch}
     */
    reRootOnClick(distance ="x"){
        super.on("click",
            (d,i,n)=>{

                const x1 = this.manager().figure().scales.x(d.v1.x),
                    x2 = this.manager().figure().scales.x(d.v0.x),
                    y1=this.manager().figure().scales.y(d.v1.y),
                    y2=this.manager().figure().scales.y(d.v0.y),
                    [mx,my] = mouse(document.getElementById(this.manager().figure().svgId));

                const proportion = distance.toLocaleLowerCase()==="x"? Math.abs( (mx - x2) / (x1 - x2)):distance.toLocaleLowerCase()==="euclidean"?
                        Math.sqrt(Math.pow(mx-x2,2)+Math.pow(my-y2,2))/Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2)):
                        null;
                if(!proportion){
                    throw new Error(`Error in reroot on click distance ${distance} is not recognize. Please use x or euclidean`)
                }

                const tree = this.manager().figure().tree();
                tree.reroot(tree.getNode(d.id),proportion)

            });
        return this;
    }
}

/**
 * Generates a line() function that takes an edge and it's index and returns a line for d3 path element. It is called
 * by the figtree class as
 * const branchPath = this.layout.branchPathGenerator(this.scales())
 * newBranches.append("path")
 .attr("class", "branch-path")
 .attr("d", (e,i) => branchPath(e,i));
 * @param scales
 * @param branchCurve
 * @return {function(*, *)}
 */

export function branchPathGenerator({scales,curveRadius,curve}) {
    const branchPath = (e, i) => {
        const branchLine = line()
            .x((v) => v.x)
            .y((v) => v.y)
            .curve(curve);
        const factor = e.v0.y - e.v1.y > 0 ? 1 : -1;
        const dontNeedCurve = e.v0.y - e.v1.y === 0 ? 0 : 1;
        const output = curveRadius > 0 ?
            branchLine(
                [{x: 0, y: scales.y(e.v0.y) - scales.y(e.v1.y)},
                    {x: 0, y: dontNeedCurve * factor * curveRadius},
                    {x: 0 + dontNeedCurve * curveRadius, y: 0},
                    {x: scales.x(e.v1.x + scales.xOffset) - scales.x(e.v0.x + scales.xOffset), y: 0}
                ]) :
            branchLine(
                [{x: 0, y: scales.y(e.v0.y) - scales.y(e.v1.y)},
                    {x: scales.x(e.v1.x + scales.xOffset) - scales.x(e.v0.x + scales.xOffset), y: 0}
                ]);
        return (output)

    };
    return branchPath;
}

export function branches(){
   return new BaubleManager()
        .class("branch")
        .data(d=>d["edges"])
        .layer("branches-layer")
}

export function branch(){
   return new Branch();
}