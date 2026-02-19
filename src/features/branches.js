import {BaubleManager} from "./baubleManager";
import {isFunction} from "../utilities";
import {Branch} from "../baubles/branch";
import {select,curveStepBefore,mouse} from "d3";
import p from "../privateConstants";

class BranchFactory extends BaubleManager{
    constructor(){
        super();
        this.elementMaker=Branch;
        this._curveRadius=0;
        this._curve =curveStepBefore;
        this.type=p.branch;
    }
    getElement(d, scales) {
        const element=super.getElement(d, scales);
        if(this._curveRadius instanceof Function){
            element.curveRadius(this._curveRadius(d))
        }else{
            element.curveRadius(this._curveRadius);
        }
        element.curve(this._curve);
        return element;
    }

    curveRadius(f) {
        if(f){
            this._curveRadius=f;
            return this;
        }
        else{
            return this._curveRadius;
        }
    }

    curve(f) {
        if(f){
            this._curve=f;
            return this;
        }
        else{
            return this._curve;
        }
    }
//TODO fix these _interactions.
    hilightOnHover() {
        super.on("mouseenter",
            (element) => (d, i,n) => {
                const parent = select(n[i]).node().parentNode;
                select(parent).classed("hovered",true);
            });
        super.on("mouseleave",
            (element) => (d,i,n) => {
                const parent = select(n[i]).node().parentNode;
                select(parent).classed("hovered",false);
            });
        return this;
    }

    reRootOnClick(){
        super.on("click",
            (branch)=>(d,i,n)=>{
                const x1 = this.scales().x(d.v1.x),
                 x2 = this.scales().x(d.v0.x),
                    y1=this.scales().y(d.v1.y),
                    y2=this.scales().y(d.v0.y),
                 [mx,my] = mouse(document.getElementById(this.figure.svgId));

                const proportion = this.curve()==d3.curveStepBefore? Math.abs( (mx - x2) / (x1 - x2)):
                    this.curveRadius()==0? Math.abs( (mx - x2) / (x1 - x2)):
                    Math.sqrt(Math.pow(mx-x2,2)+Math.pow(my-y2,2))/Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2)),
                    tree = this.figure.tree();
                tree.reroot(tree.getNode(d.id),proportion)
            });
        return this;
    }
}

export const branches=()=>{
    return new BranchFactory()
        .class("branch")
        .data(d=>d["edges"])
        .layer("branches-layer")
};