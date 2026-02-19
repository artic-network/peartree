import {mergeDeep} from "../utilities";
import {Bauble} from "./bauble";
import {select} from "d3";
import uuid from "uuid"
import p from "../privateConstants";
/** @module bauble */


/**
 * The CircleBauble class. Each vertex is assigned a circle in the svg.
 */
export class CircleBauble extends Bauble{


    /**
     * The constructor.
     * @param [settings.radius=6] - the radius of the circle
     */
    constructor()
    {
        super();
        this._attrs={"r":5,"cx":0,"cy":0}
    }


    /**
     * A function that assigns cy,cx,and r attributes to a selection. (cx and cy are set to 0 each r is the settings radius
     * plus the border.
     * @param selection
     */
    update(selection=null) {
        if(selection==null&&!this.selection){
            return
        }
        if(selection){
            this.selection=selection;
        }
        return selection
            .selectAll(`.${this.id}`)
            .data(d => [d].filter(this.filter()),d=>this.id)
            .join(
                enter => enter
                    .append("circle")
                    .attr("class",`node-shape ${this.id}`)
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
                        .attrs(this._attrs)
                        .each((d,i,n)=>{
                            const element = select(n[i]);
                            for( const [key,func] of Object.entries(this._interactions)){
                                element.on(key,(d,i,n)=>func(d,i,n))
                            }
                        }),
                    )
                );
    };
//TODO move some of the these to a master class
    /**
     * Helper function to class the node as 'hovered' and update the radius if provided
     * @param r - optional hover radius
     * @return {CircleBauble}
     */
    hilightOnHover(r = null) {
        let oldR;
        super.on("mouseenter",
            (d, i,n) => {
                if(r) {
                    if (!this._attrs.r) {
                        this._attrs.r = this._attrs["r"];
                    }
                    oldR=this._attrs["r"];
                    this.attr("r", r);
                }
                const parent = select(n[i]).node().parentNode;
                this.update(select(parent));
                select(parent).classed("hovered",true)
                    .raise();
                if(r){
                    this.attr("r", oldR);

                }

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
    annotateOnClick(key){
        super.on("click",
            (d, i,n) => {
            const node = this.manager().figure()[p.tree].getNode(d.id) //TODO helper getters
                this.manager().figure()[p.tree].annotateNode(node,{[key]:!node.annotations[key]});
                this.manager().figure()[p.tree].treeUpdateCallback();
                const parent = select(n[i]).node().parentNode;
                select(parent).raise();
            });
        return this;
    }
}

/**
 * helper function returns a new instance of a circle bauble.
 * @return {CircleBauble}
 */
export function circle(){
    return new CircleBauble();
}
