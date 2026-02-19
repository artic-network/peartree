import rough from 'roughjs/dist/rough.umd';
import {mergeDeep} from "../utilities";
import {Bauble} from "./bauble";
/** @module bauble */

/**
 * The CircleBauble class. Each vertex is assigned a circle in the svg.
 */
export class RoughCircleBauble extends Bauble {

    /**
     * The default settings for the circleBauble
     * The default is 6;
     * @return {{radius: number}}
     * @constructor
     */
    static DEFAULT_SETTINGS() {
        return {
            radius: 6,
            fill: "red",
            attrs: {
                roughFill: {stroke: () => "black", fill: () => "none"},
                roughStroke: {"stroke-width": () => 0.5, stroke: () => "black", fill: () => "none"}
            },
            styles: {roughFill: {}, roughStroke: {}},

        };
    }

    /**
     * The constructor.
     */
    constructor(settings = {}) {
        super(mergeDeep(RoughCircleBauble.DEFAULT_SETTINGS(), settings));
    }

    /**
     * A function to append the circles to the svg.
     * @param selection
     * @return {Bundle|MagicString|*|void}
     */
    update(selection, border = 0) {


        const newPaths = [...roughFactory.circle(0, 0, this.settings.radius + border, this.settings).childNodes]
            .map(d => d.getAttribute("d")).reverse(); // this puts the "stroke" before the fill so if there is no fill we just never hit it below
        const pathNames = ["roughStroke","roughFill"] ;
        return selection.selectAll("path")
            .data(d =>[d,d].slice(0,newPaths.length))
            .join(
                enter => enter
                    .append("path")
                    .attr("d", (d, i) => newPaths[i])
                    .attr("class", (d,i) => `${pathNames[i]} node-shape rough`)
                    .attrs((vertex, i) => {
                        const attributes = this.settings.attrs[pathNames[i]];
                        return Object.keys(attributes).reduce((acc, curr) => {
                            return {...acc, [curr]: attributes[curr](vertex)}
                        }, {})
                    })
                    .styles((vertex, i, n) => {
                        const styles = this.settings.styles[pathNames[i]];
                        return Object.keys(styles).reduce((acc, curr) => {
                            return {...acc, [curr]: styles[curr](vertex)}
                        }, {})
                    }),
                update => update
                    .call(update => update.transition()
                        .attr("d", (d, i) => newPaths[i])
                        .attrs((vertex, i) => {
                            const attributes = this.settings.attrs[pathNames[i]];
                            return Object.keys(attributes).reduce((acc, curr) => {
                                return {...acc, [curr]: attributes[curr](vertex)}
                            }, {})
                        })
                        .styles((vertex, i) => {
                            const styles = this.settings.styles[pathNames[i]];
                            return Object.keys(styles).reduce((acc, curr) => {
                                return {...acc, [curr]: styles[curr](vertex)}
                            }, {})
                        }),
                    )
            )
    };
}

export const roughFactory = rough.svg(document.createElement("svg"));