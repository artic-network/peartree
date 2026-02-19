import {select} from "d3";
import {Bauble} from "./bauble";

/**
 * Bauble class for labels
 */
export class Label extends Bauble{
    constructor() {
        super();
        this._text=()=>"";
        this._scaleX=false;
        this._scaleY=false;
        return this;
    }
    update(selection){
        return selection
            .selectAll(`.${this.id}`)
            .data(d => [d].filter(this.filter()),d=>`label-${this.id}`)
            .join(
                enter => enter
                    .append("text")
                    .attr("class",`label ${this.id}`)
                    .attrs(this._attrs)
                    .each((d,i,n)=>{
                        const element = select(n[i]);
                        for( const [key,func] of Object.entries(this._interactions)){
                            element.on(key,(d,i,n)=>func(d,i,n))
                        }
                    })
                    .text(d=>this._text(d)),
                update => update
                    .call(update => update.transition()
                        .duration(this.transitions().transitionDuration)
                        .ease(this.transitions().transitionEase)
                        .attrs(this._attrs)
                        .each((d,i,n)=>{
                            const element = select(n[i]);
                            for( const [key,func] of Object.entries(this._interactions)){
                                element.on(key,(d,i,n)=>func(d,i,n))
                            }
                        })
                        .text(d=>this._text(d))
                    )
            );
    };

    text(f){
        if(f==null){
            return this._text;
        }else{
            if(f instanceof String||typeof f==="string"){
                this._text = ()=>f;
            }else{
                this._text=f;
            }
            return this;
        }
    }

}


//((this.scales.x(e.v1.x+this.xScaleOffset) - this.scales.x(e.v0.x+this.xScaleOffset)) / 2))
/**
 * Helper function for making labels. Sets position and alignment based on
 * vertex or edge object.
 * @param text
 * @return {*}
 */
export function label(text){

return new Label()
        .attr("x",d=>d.textLabel.x)
        .attr("y",d=> d.textLabel.y)
        .attr("alignment-baseline",d=>d.textLabel.alignmentBaseline)
        .attr("text-anchor",d=>d.textLabel.textAnchor)
        .text(text)


}

/**
 * Helper function filters label to just work on tips
 * @param text - string or function for assigning label (will be passed vertex or edge)
 * @return {*}
 */
export function tipLabel(text){
    return label(text)
        .filter(d=>d.degree===1);
}
/**
 * Helper function filters label to just work on internal nodes
 * @param text
 * @return {*}
 */
export function internalNodeLabel(text){
    return label(text)
        .filter(d=>d.degree>1);
}

/**
 * Helper function that puts label in the middle of a curveStepBefore branch
 * @param text
 * @return {Bauble|*|null|undefined}
 */
export function branchLabel(text){
   return label(text)
        .scaledX(d=>(d.v1.x-d.v0.x)/2);
    // const setX = obj => d=>{
    //     // console.log((obj.scales().x(d.v1.x)-obj.scales().x(d.v0.x)/2));
    //     return (obj.scales().x(d.v1.x)-obj.scales().x(d.v0.x))/2
    // };
    // return l.attr("x",setX(l))
}