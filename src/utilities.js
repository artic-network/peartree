//https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
import {timeParse,timeFormat} from "d3"

export function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export  function mergeDeep(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = mergeDeep(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

//https://stackoverflow.com/questions/29400171/how-do-i-convert-a-decimal-year-value-into-a-date-in-javascript
/**
 * Helper function to determine if the provided year is a leap year
 * @param year
 * @return {boolean}
 */
export function leapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

/**
 * A function which converts a decimal float into a date object
 * @param decimalDate
 * @return {Date}
 */
export function decimalToDate(decimal){
    const year = Math.trunc(decimal);
    const totalNumberOfDays = leapYear(year)? 366:365;
    const day = Math.round(((decimal-year)*totalNumberOfDays));
    return timeParse("%Y-%j")(`${year}-${day}`)

}

/**
 * A function that converts a date into a decimal.
 * @param date
 * @return {number}
 */
export function dateToDecimal(date){
    const year = parseInt(timeFormat("%Y")(date));
    const day = parseInt(timeFormat("%j")(date));
    const totalNumberOfDays = leapYear(year)? 366:365;
    return year+day/totalNumberOfDays
}
//https://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript
export function isInt(value) {
    return !isNaN(value) &&
        parseInt(Number(value)) == value &&
        !isNaN(parseInt(value, 10));
}

export const compose=(...fns)=>(arg)=>{
    return fns.reduceRight((res,fn)=>fn(res),arg);
}


//https://stackoverflow.com/questions/526559/testing-if-something-is-a-class-in-javascript
export function isFunction(funcOrClass) {
    const propertyNames = Object.getOwnPropertyNames(funcOrClass);
    return (!propertyNames.includes('prototype') || propertyNames.includes('arguments'));
}