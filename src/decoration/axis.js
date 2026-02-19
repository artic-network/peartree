import {axisBottom, axisLeft, axisRight, axisTop,format} from "d3";
import {Decoration} from "./decoration";

/**
 * The axis class
 */
class Axis extends Decoration {
    constructor(){
        super();
        this._ticks=5;
        this._tickFormat=format(".1f");
        this._title={
            text:"",
            xPadding:0,
            yPadding:0,
            rotation:0
        };
        this._location="bottom";
        this._x=0;
        this._y=0;
        super.layer("axes-layer")
        this._reverse = false;
        this._origin=null;
    }

    /**
     * Get or set the location of the ticks on the axis. "bottom", "top","left",'right"
     * @param string
     * @return {string|Axis}
     */
    location(string=null){
        if(!string){
            return this._location
        }else{
            this._location=string;
            return this;
        }
    }

    origin(x=null){
        if(x===null){
            return this._origin;
        }else{
            this._origin=x;
            return this;
        }
    }

   reverse(){
        this._reverse=!this._reverse;
        return this;
   }

    updateScales(){
        this.d3Axis = getD3Axis(this._location);
        const length = ["top","bottom"].indexOf(this._location)>-1?
            this.scales().width - this.figure()._margins.left - this.figure()._margins.right:
            this.scales().height -this.figure()._margins.top - this.figure()._margins.bottom;


        const scale =(["top","bottom"].indexOf(this._location)>-1?this.scales().x:this.scales().y).copy();

        if(this.origin()!==null){
            scale.domain(scale.domain().reverse().map((d,i)=>(i===0?this.origin()-d:this.origin())));
        }
        if(this._reverse){
            scale.domain(scale.domain().reverse())
        }

        //TODO add options to change scales and all that jazz

        const axis = this.d3Axis(scale)
            .ticks(this.ticks()).tickFormat(this.tickFormat());
        return {length,axis}
    }

    create() {
        const {length,axis} = this.updateScales();
        const selection = this.figure().svgSelection.select(`.${this.layer()}`);

        selection
            .append("g")
            .attr("id", this._id)
            .attr("class", "axis")
            .attr("transform", `translate(${this._x}, ${this._y})`)
            .call(axis);

        const pos={x:0,y:0};
        if(this.location().toLowerCase() === "bottom" || this.location().toLowerCase() === "top"){
            pos.x = length/2
        }else{
            pos.y=length/2
        }

        selection
            .append("g")
            .attr("id", `${this._id}-label`)
            .attr("class", "axis-label")
            .attr("transform", `translate(${this._x}, ${this._y})`)
            .append("text")
            .attr("transform", `translate(${pos.x+this._title.xPadding}, ${pos.y+this._title.yPadding}) rotate(${this._title.rotation})`)
            .attr("alignment-baseline", "hanging")
            .style("text-anchor", "middle")
            .text(this._title.text);
    };

    /**
     * Get or set the tick format used. This is passed to the d3 Axis.
     * @param d
     * @return {Axis|*}
     */
    tickFormat(d){
        if(d){
            this._tickFormat=d;
            return this;
        }else{
            return this._tickFormat;
        }
    }

    /**
     * Get or set the number of ticks. This is passed to the d3 axis and is a suggestion not a demand.
     * @param d
     * @return {Axis|number}
     */
    ticks(d){
        if(d){
            this._ticks=d;
            return this;
        }else{
            return this._ticks;
        }
    }

    updateCycle() {

        const {length,axis} = this.updateScales();

        const selection = this.figure().svgSelection.select(`.${this.layer()}`);


        selection
            .select(`g#${this._id}`)
            .transition()
            // .duration()
            .attr("id", this._id)
            .attr("class", "axis")
            .attr("transform", `translate(${this._x}, ${this._y})`)
            .call(axis);

        const pos={x:0,y:0};
        if(this._location.toLowerCase() === "bottom" || this._location.toLowerCase() === "top"){
            pos.x = length/2
        }else{
            pos.y=length/2
        }
        selection
            .select(`g#${this._id}-axis-label`)
            .transition()
            // .duration()
            .attr("transform", `translate(${this._x}, ${this._y})`)
            .select("text")
            .transition()
            // .duration()
            .attr("transform", `translate(${pos.x+this._title.xPadding}, ${pos.y+this._title.yPadding}) rotate(${this._title.rotation})`)
            .attr("alignment-baseline", "hanging")
            .style("text-anchor", "middle")
            .text(this._title.text);

    };


}


function getD3Axis(location) {
    switch (location.toLowerCase()) {
        case "bottom":
            return axisBottom;
        case "left":
            return axisLeft;
        case "top":
            return axisTop;
        case "right":
            return axisRight;
        default:
            throw new Error(`Unknown location type ${this.location}`);
    }
}

export function axis(){
    return new Axis();
}