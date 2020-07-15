/**
* @class
*/
class KyaputenToolkit {
    /**
     * @constructor
     */
    constructor () {
        this.debounce_fn = {}
        this.viewport = {
            sm: '(min-width: 576px)',
            md: '(min-width: 768px)',
            lg: '(min-width: 992px)',
            xl: '(min-width: 1200px)',
        }
    }

    /**
     * Debounces a function
     * @param {String} key
     * @param {Function} fn 
     * @param {Number} [delay=250]
     * @return {Boolean}
     */
    async debounce (key, fn, delay = 250) {
        const that = this

        // If this function is on cooldown, ignore the call
        if (this.debounce_fn[key]) return false

        // Call the function
        fn()

        // Create the cooldown
        this.debounce_fn[key] = setTimeout(function () {
            clearTimeout(that.debounce_fn[key])
            delete that.debounce_fn[key]
        }, delay)
    }

    /**
     * Detect touch screen devices.
     * @return {Boolean}
     */
    isTouchEnabled () {
        return 'ontouchstart' in window
    }

    /**
     * Checks to see if val is in the Array arr
     * @param {Array} arr - The Array to check
     * @param {String} val - The name of the attribute
     * @return {Boolean}
     */
    in (arr = [], val = '') {
        return !!~arr.indexOf(val)
    }

    /**
     * Gets the key of the value in an Object
     * @param {Object} obj 
     * @param {*} val 
     * @return {*}
     */
    getObjKey (obj = {}, val = '') {
        return Object
            .keys(obj)
            .find((k) => {
                return obj[k].toLowerCase() == val.toLowerCase()
            })
    }

    /**
     * Get the value of the path in an Object
     * @param {Object} obj - The object to traverse
     * @param {String} path - The path to the value
     * @return {*}
     */
    getObjValue (obj = {}, path = '') {
        if (obj == undefined) return undefined

        // Convert the path to an Array if it is already not
        if (!Array.isArray(path)) path = path.split('.')

        // When there is no more depth to recurse, return the value
        if (!path.length) return obj

        // Get the prop
        const field = path.shift()

        // If the prop exists, recurse and return
        if (Object.prototype.hasOwnProperty.call(obj, field)) return this.getObjValue(obj[field], path)

        // If the prop does not exist, return undefined
        return undefined
    }

    /**
     * Set the value of the path in an Object
     * @param {Object} obj - The object to traverse
     * @param {Array|string} [path] - The path to the value
     * @param {*} val - The value to store
     * @return {Object}
     */
    setObjValue (obj = {}, path = [], val = undefined) {
        // Convert the path to an Array if it is already not
        if (!Array.isArray(path)) path = path.split('.')

        // Edge case: No path length. Just return
        if (!path.length) return obj

        // Get the prop
        const field = path.shift()

        // Array, not an Object
        if (this.in(field, '[')) {
            const [short_field, key] = field.match(/\w+\b/g)

            // If the prop does not exist, create it
            if (!obj.hasOwnProperty(short_field)) {
                obj[short_field] = []
            }

            // Instantiate the array index
            obj[short_field][key ? key : 0] = {}

            // When there is no more depth to recurse, assign the value
            if (!path.length) {
                obj[short_field][key] = val
                return obj
            }

            // Recurse and return
            return this.setObjValue(obj[short_field][key], path, val)
        }

        // If the prop does not exist, create it
        if (!obj.hasOwnProperty(field)) obj[field] = {}

        // When there is no more depth to recurse, assign the value
        if (!path.length) {
            obj[field] = val
            return obj
        }

        // Recurse and return
        return this.setObjValue(obj[field], path, val)
    }

    /**
     * Set the value (or text) of a JQuery Element
     * @param {jQuery} $element - The JQuery Element
     * @param {String} val - The value to set
     * @return {KyaputenToolkit}
     */
    setElementValue ($element = $(), val = '') {
        // No element
        if (!$element.length) return this

        // Do something based upon tagName
        switch ($element.prop('tagName').toLowerCase()) {
        // Inputs
        case 'input':
            if ($element.is(':checkbox')) $element.prop('checked', val)
            else $element.val(val)
            break

        case 'select':
        case 'textarea':
            $element.val(val)
            break

        default:
            $element.text(val)
        }

        return this
    }

    /**
     * 
     * @param {String} str 
     * @return {String}
     */
    slugify (str) {
        return str.toLowerCase().replace(/[':()]/g, '').split(' ').join('-')
    }
}

// Declare
const Utils = new KyaputenToolkit()