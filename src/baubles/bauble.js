"use strict";

/** @module bauble */
import {mergeDeep} from "../utilities";
import {easeLinear} from "d3"
import set from "@babel/runtime/helpers/esm/set";
import uuid from "uuid";

/**
 * The Bauble class
 *
 * This is a shape or Decoration at the node or edge of a tree.
 */
export class Bauble {
    constructor() {
        this.id=`n${uuid.v4()}`;
        this._attrs ={};
        this._interactions = {};
        this._filter=()=>true;
    }

    /**
     * A function that appends the element to the selection, joins the data, assigns the attributes to the svg objects
     * updates and remove unneeded objects.
     * @param selection
     */
    update(selection) {
        throw new Error("Don't call the base class method")

    }


    /**
     * Getter or setter of bauble filter. The filter is function that will be passed the vertex or edge.It should return
     * true or false
     * @param f
     * @return {(function(): boolean)|Bauble}
     */
    filter(f=null){
        if(f===null){
            return this._filter;
        }else{
            this._filter=f;
            return this;
        }
    }

    /**
     * Get or set the bauble manager that handles these elements. this is called by the manager when the element
     * is added.
     * @param manager
     * @return {Bauble|*}
     */

    manager(manager=null){
        if(manager===null){
            return this._manager;
        }else{
            this._manager=manager;
            return this;
        }
    }

    /**
     * Get or set attributes that will style the elements.
     * @param string
     * @param value - a string, number, or function that will be passed to d3 selection.
     * @return {Bauble|*}
     */
    attr(string,value=null){
        if(value){
            this._attrs[string] = value;
            return this
        }else{
            return this._attrs[string]
        }
    }

    /**
     * Set a call back to be fired when the event listener is triggered.
     * @param eventListener - a string that defines the event listener
     * @param value -  call back that will be passed d,i,n
     * @return {Bauble}
     */
    on(eventListener,value){
        this._interactions[eventListener] = value;
        return this;
    }

    /**
     * Get or set the transition duration and ease. Defualts to the figtree instance.
     * @param t - optional object {tranmsissionDuration: transmissionEase:}
     * @return {Bauble|BaubleManager|*|Bauble}
     */
    transitions(t=null){
        if(t===null){
            if(this._transitions){
                return this._transitions;
            }else{
                return this.manager().figure().transitions();
            }

        }else{
            this._transitions=t;
            return this;
        }
    }

    /**
     * Get or set the scales used in the element defaults to the figtree instance.
     * @param scales
     * @return {Bauble.scales|*}
     */
    scales(scales=null){
        if(scales){
            this._scales=scales
        }else{
            if(this._scales){
                return this._scales;
            }else{
                return this.manager().figure().scales
            }
        }
    }

    /**
     * sets the x position based on the scale
     * @param unscaledValue - number or function that is passed the data
     */
    scaledX(unscaledValue){
        const n=parseFloat(unscaledValue);
        if(n){
            this.attr("x",d=>this.scales().x(unscaledValue))
        }
        else{
            this.attr("x",d=>this.scales().x(unscaledValue(d)))
        }
        return this;

    }
    /**
     * sets the y position based on the scale
     * @param unscaledValue - number or function that is passed the data
     */
    scaledY(unscaledValue){
        const n=parseFloat(unscaledValue);
        if(n){
            this.attr("y",d=>this.scales().y(unscaledValue))
        }
        else{
            this.attr("y",d=>this.scales().y(unscaledValue(d)))
        }
        return this;
    }
    // revealOnHover(){
    //
    //     this.filter()
    //     //TODO put listener on parent only insert this element if the parent is hovered or clicked ect.
    // }

}



