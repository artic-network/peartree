import {Decoration} from "./decoration";
import {select} from "d3";
import p from "../privateConstants";

/**
 * A discrete legend for displaying traits
 */
class Legend extends Decoration {
    constructor() {
        super();
        this._title = {
            text: "",
            xPadding: 0,
            yPadding: 0,
            rotation: 0
        };
        this._x = 0;
        this._y = 0;
        super.layer("axes-layer")
        this._size=20;
        this._scale=null;
    }

    /**
     * The size of the square used to display the color
     * @param d
     * @return {Legend|number}
     */
    size(d = null) {
        if (!d) {
            return this._size
        } else {
            this._size = d;
            return this;
        }
    }

    /**
     * get or set the ordinal color scale the legend displays
     * @param scale
     * @return {null|Legend}
     */
    scale(scale = null) {
        if (scale===null) {
            return this._scale
        } else {
            this._scale = scale;
            return this;
        }
    }

    create() {

        if(this.scale()===null){
            return;
        }
        const selection = this.figure().svgSelection.select(`.${this.layer()}`);

        const group = selection
            .append("g")
            .attr("id", this._id)
            .attr("class", "legend")
            .attr("transform", `translate(${this._x}, ${this._y})`);
//https://www.d3-graph-gallery.com/graph/custom_legend.html#cont1
// Add one dot in the legend for each name.
        group.selectAll("rect")
            .data(this.scale().domain())
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y",  (d, i) =>{
                return i * (this.size() + 5)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("width", this.size())
            .attr("height", this.size())
            .attr("fill",  (d) =>{
                return this.scale()(d)
            })
            .each((d,i,n)=>{
                const element = select(n[i]);
                for( const [key,func] of Object.entries(this._interactions)){
                    element.on(key,(d,i,n)=>func(d,i,n))
                }
            });


// Add one dot in the legend for each name.
        group.selectAll("text")
            .data(this.scale().domain())
            .enter()
            .append("text")
            .attr("x", this.size() * 1.2)
            .attr("y",  (d, i)=> {
                return i * (this.size() + 5) + (this.size() / 2)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .text(function (d) {
                return d
            })
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle");
    };

    updateCycle() {
        if(this.scale()===null){
            return;
        }
        const selection = this.figure().svgSelection.select(`.${this.layer()}`);

        const group = selection
            .select(`g#${this._id}`)
            .transition()
            .attr("transform", `translate(${this._x}, ${this._y})`);
//https://www.d3-graph-gallery.com/graph/custom_legend.html#cont1
// Add one dot in the legend for each name.
        group.selectAll("rect")
            .transition()
            .attr("x", 0)
            .attr("y",  (d, i)=> {
                return i * (this.size() + 5)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("width", this.size())
            .attr("height", this.size())
            .attr("fill",(d) =>{
                return this.scale()(d)
            })
            .each((d,i,n)=>{
                const element = select(n[i]);
                for( const [key,func] of Object.entries(this._interactions)){
                    element.on(key,(d,i,n)=>func(d,i,n))
                }
            });

// Add one dot in the legend for each name.
        group.selectAll("text")
            .transition()
            .attr("x", this.size() * 1.2)
            .attr("y",  (d, i) =>{
                return i * (this.size() + 5) + (this.size() / 2)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .text(function (d) {
                return d
            })
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle");


    }


}

/**
 * helper function that returns a new legend instance
 * @return {Legend}
 */
export function legend(){
    return new Legend();
}