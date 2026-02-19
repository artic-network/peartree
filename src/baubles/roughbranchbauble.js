import {Bauble} from "./bauble";
import {mergeDeep} from "../utilities";
import {branchPathGenerator} from "./branch";
import {roughFactory} from "./roughcirclebauble";
import {curveStepBefore} from "d3"
/** @module bauble */

export class RoughBranchBauble extends Bauble {
    static DEFAULT_SETTINGS() {
        return {
            curve: curveStepBefore,
            curveRadius: 0,
            attrs: {
                // roughFill: {stroke: () => "none", fill: () => "none"},
                "stroke-width": () => 0.5, stroke: () => "black", fill: () => "none"
            },
            styles:  {},
            vertexFilter: null,
            edgeFilter: () => true,
            roughness:20,
        }


    }

    constructor(settings) {
        super(mergeDeep(RoughBranchBauble.DEFAULT_SETTINGS(), settings));
    }

    get edgeFilter() {
        return this.settings.edgeFilter
    }

    setup(scales = {}) {
        scales = mergeDeep({x: null, y: null, xOffset: 0, yOffset: 0}, scales);
        const basicPathGenerator = branchPathGenerator({scales:scales,curve:this.settings.curve,curveRadius:this.settings.curveRadius});
        this.branchPath = (edge)=>{
            const basicPath =basicPathGenerator(edge);
            return [...roughFactory.path(basicPath,this.settings).childNodes].map(d=>d.getAttribute("d"))[0]

        }
    }

    update(selection) {

        return selection.selectAll("path")
            .data(d => [d])
            .join(
                enter => enter
                    .append("path")
                    .attr("d", edge => this.branchPath(edge))
                    .attr("class", "branch-path")
                    .attrs((edge) => {
                        const attributes = this.settings.attrs;
                        return Object.keys(attributes).reduce((acc, curr) => {
                            // const vertex = d3.select(n[i].parentNode).datum(); // the vertex data is assigned to the group
                            return {...acc, [curr]: attributes[curr](edge)}
                        }, {})
                    })
                    .styles((edge) => {
                        const styles = this.settings.styles;
                        return Object.keys(styles).reduce((acc, curr) => {
                            // const vertex = d3.select(n[i].parentNode).datum(); // the vertex data is assigned to the group
                            return {...acc, [curr]: styles[curr](edge)}
                        }, {})
                    }),
                update => update
                    .call(update => update.transition()
                        .attr("d", edge => this.branchPath(edge))
                        .attrs((edge) => {
                            const attributes = this.settings.attrs;
                            return Object.keys(attributes).reduce((acc, curr) => {
                                // const vertex = d3.select(n[i].parentNode).datum(); // the vertex data is assigned to the group
                                return {...acc, [curr]: attributes[curr](edge)}
                            }, {})
                        })
                        .styles((edge) => {
                            const styles = this.settings.styles;
                            return Object.keys(styles).reduce((acc, curr) => {
                                // const vertex = d3.select(n[i].parentNode).datum(); // the vertex data is assigned to the group
                                return {...acc, [curr]: styles[curr](edge)}
                            }, {})
                        }),
                    )
            )
    };
}
