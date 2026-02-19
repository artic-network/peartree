import {mergeDeep} from "../utilities";
import {Bauble} from "./bauble";
import {select} from "d3";
import uuid from "uuid";
import p from "../privateConstants";
/** @module bauble */

export class RectangularBauble extends Bauble {

    constructor() {
        super();
        this._attrs ={
                height: 16,
                width: 6,
                rx: 2,
                ry:2,
            };
        }


    /**
     * A function that assigns width,height,x,y,rx, and ry attributes to a rect selection.
     * @param selection
     * @param border
     * @return {*|null|undefined}
     */
    update(selection){
    if(selection==null&&!this.selection){
        return
    }
    if(selection){
        this.selection=selection;
    }
        const w = this.attr("width");
        const h =this.attr("height");
        return selection
            .selectAll(`.${this.id}`)
            .data(d => [d].filter(this.filter()),d=>this.id)
            .join(
                enter => enter
                    .append("rect")
                    .attr("class",`node-shape ${this.id}`)
                    .attr("x", -w / 2)
                    .attr("y", -h / 2)
                    .attrs(this._attrs)
                    .each((d,i,n)=>{
                        const element = select(n[i]);
                        for( const [key,func] of Object.entries(this._interactions)){
                            element.on(key,(d,i,n)=>func(d,i,n))
                        }
                    }),
                update => update
                    .call(update =>update.transition(d=>`u${uuid.v4()}`)
                        .duration(this.transitions().transitionDuration)
                        .ease(this.transitions().transitionEase)
                        .attr("x", -w / 2)
                        .attr("y", -h / 2)
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

    /**
     * Helper function to class the node as 'hovered' and update the radius if provided
     * @param r - optional hover border
     * @return {retangleBauble}
     */
    hilightOnHover(r = null) {
        let oldR;
        super.on("mouseenter",
            (d, i,n) => {
                if(r) {
                    if (!this._attrs.r) {
                        this._attrs.r = this._attrs["r"];
                    }
                    this.attr("width", this.attr("width")+r);
                    this.attr("height", this.attr("height")+r);

                }
                const parent = select(n[i]).node().parentNode;
                this.update(select(parent));
                select(parent).classed("hovered",true)
                    .raise();

                this.attr("width", this.attr("width")-r);
                this.attr("height", this.attr("height")-r);
                // move to top

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
     * Rotate a node on click
     * @param recursive - optional default -false;
     * @return {CircleBauble}
     */
    rotateOnClick(recursive=false){
        super.on("click",(d,n,i)=>{
            const node = this.manager().figure()[p.tree].getNode(d.key);
            this.manager().figure()[p.tree].rotate(node,recursive);
        });
        return this;
    }
    /**
     * helper method to annotate the underlying tree node as key:true; Useful for linking interactions between figures
     * that share a tree.
     * @param key
     * @return {CircleBauble}
     */
    annotateOnHover(key){
        super.on("mouseenter",
            (d, i,n) => {
                this.manager().figure()[p.tree].annotateNode(this.manager().figure()[p.tree].getNode(d.id),{[key]:true});
                this.manager().figure()[p.tree].treeUpdateCallback();
                const parent = select(n[i]).node().parentNode;
                select(parent).raise();
            });
        super.on("mouseleave",
            (d,i,n) => {
                this.manager().figure()[p.tree].annotateNode(this.manager().figure()[p.tree].getNode(d.id),{[key]:false});
                this.manager().figure()[p.tree].treeUpdateCallback();
            });
        return this;
    }
}
export function rectangle(){
    return new RectangularBauble();
}