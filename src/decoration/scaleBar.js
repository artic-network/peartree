import {Decoration} from "./decoration";

/**
 * Scale bar decorator
 */
class ScaleBar extends Decoration {
    constructor(){
        super();
        this._title={
            text:"",
            xPadding:0,
            yPadding:0,
            rotation:0
        };
        this._length=1;
        this._direction="x"
        this._x=0;
        this._y=0;
        super.layer("axes-layer")
    }

    /**
     * Set or get the length of the scale bar in the same units on the branches of the tree
     * @param d
     * @return {ScaleBar|number}
     */
    length(d=null){
        if(!d){
            return this._length
        }else{
            this._length=d;
            return this;
        }
    }

    /**
     * Get or set the direction of the scaleBar "x" or "y". This also determines which scale is used to convert the length
     * to pixels.
     * @param string
     * @return {string|ScaleBar}
     */
    direction(string=null){
        if(!string){
        return this._direction
    }else{
        this._direction=string;
        return this;
    }
    }

    create() {

        const selection = this.figure().svgSelection.select(`.${this.layer()}`);

        const group =selection
            .append("g")
            .attr("id", this._id)
            .attr("class", "scale-bar")
            .attr("transform", `translate(${this._x}, ${this._y})`)

            group
            .append("line")
                .attr("x1",0)
                .attr("y1",0)
                .attr("x2",(this.direction()==="x"?this.scales().x(this._length): 0))
                .attr("y2",(this.direction()==="y"?this.scales().y(this._length): 0))
                .attr("stroke","black")

        const pos={x:0,y:0};
        if(this.direction() === "x"){
            pos.x = this.scales().x(this._length)/2
        }else{
            pos.y=this.scales().y(this._length)/2
        }
        group
            .append("text")
            .attr("transform", `translate(${pos.x+this._title.xPadding}, ${pos.y+this._title.yPadding}) rotate(${this._title.rotation})`)
            .attr("alignment-baseline", "hanging")
            .style("text-anchor", "middle")
            .text(this._title.text);


    };

    updateCycle() {

        const selection = this.figure().svgSelection.select(`.${this.layer()}`);

        const group =selection
            .select(`g#${this._id}`)
            .transition()
            .attr("transform", `translate(${this._x}, ${this._y})`)
            .select("line")
                .attr("x1",0)
                .attr("y1",0)
                .attr("x2",(this.direction()==="x"?this.scales().x(this._length): 0))
                .attr("y2",(this.direction()==="y"?this.scales().y(this._length): 0))
                .attr("stroke","black")


        const pos={x:0,y:0};
        if(this.direction() === "x"){
            pos.x = this.scales().x(this._length)/2
        }else{
            pos.y=this.scales().y(this._length)/2
        }

        group
            .select("text")
            .attr("transform", `translate(${pos.x+this._title.xPadding}, ${pos.y+this._title.yPadding}) rotate(${this._title.rotation})`)
            .attr("alignment-baseline", "hanging")
            .style("text-anchor", "middle")
            .text(this._title.text);

    };


}

/**
 * Helper function that returns a new scalebar instance.
 * @return {ScaleBar}
 */
export function scaleBar(){
    return new ScaleBar();
}