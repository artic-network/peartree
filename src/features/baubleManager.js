import {isFunction} from "../utilities";
import {select} from "d3";


// also but some case specific helper functions for each style.

/**
 * This is managing class that handles the groups that hold visible elements. These visible elements map to a node or
 * edge, and a group is added for each one. The manager positions the groups and then calls the update
 * methods of any elements .
 */
export  class BaubleManager{
    constructor(type=null) {

        this.type = null;
        this._baubleHelpers=[];
        this._filter = ()=>true;

        return this;
    }

    /**
     * Get or set svg layer elements will be added to.
     * @param l
     * @return {BaubleManager|*}
     */
    layer(l=null){
        if(l===null){
            return this._layer
        }else{
            this._layer=l;
            return this
        }
    }

    /**
     * Get or set the figtree instance this manager works for. This allows the manager to access the figure's scale ect.
     * @param f
     * @return {BaubleManager|*}
     */
    figure(f=null){
        if(f===null) {
            return this._figure;
        }
        else{
            this._figure=f;
            return this;
        }
    }

    /**
     * Add an element to the managers update cycle. The element's update method will be passed
     * each group selection in turn and should add, update, or remove visible elements.
     * @param b
     * @return {BaubleManager}
     */
    element(b){
        b.manager(this);
        this._baubleHelpers=this._baubleHelpers.concat(b);
        return this;
    }

    /**
     * Get or set the class assigned to each group managed by the manager.
     * @param c
     * @return {BaubleManager|*}
     */
    class(c=null){
        if(c===null) {
            return this._class;
        }
        else{
            this._class=c;
            return this;
        }
    }

    /**
     * Update the groups and each on to the each sub element.
     * @param data
     */
    update(data){
        const self=this;
        if(this._figure===null||this._class===null||this._layer===null){
            console.warn("incomplete element manager");
            return
        }
        let svgLayer;
        svgLayer = this.figure().svgSelection.select(`.${this.layer()}`);
        if(svgLayer.empty()){
            svgLayer = this.figure().svgSelection.append("g").attr("class",this.layer());
        }
        svgLayer.selectAll(`.${this.class()}`)
            .data(data, (d) => `${this.class()}_${d.key}`)
            .join(
                enter => enter
                    .append("g")
                    .attr("id", (d) => d.key)
                    .attr("class", (d) => [`${this.class()}`, ...d.classes].join(" "))
                    .attr("transform", (d) => {
                        return `translate(${this.figure().scales.x(d.x)}, ${this.figure().scales.y(d.y)})`;
                    })
                    .each(function (d) {
                       for(const bauble of self._baubleHelpers){
                           bauble.update(select(this));
                       }
                    }),
                update => update
                    .call(update => update.transition()
                        .duration(this.figure().transitions().transitionDuration)
                        .ease(this.figure().transitions().transitionEase)
                        .attr("class", (d) => [`${this.class()}`, ...d.classes].join(" "))
                        .attr("transform", (d) => {
                            return `translate(${this.figure().scales.x(d.x)}, ${this.figure().scales.y(d.y)})`;
                        })
                        .each(function (d) {
                            for(const bauble of self._baubleHelpers){
                                bauble.update(select(this));
                            }
                        })
                    )
            );
    }



}


