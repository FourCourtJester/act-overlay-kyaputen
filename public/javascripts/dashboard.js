/**
 * SonshoDashboard
 * @class
 */
class SonshoDashboard {
    /**
     * @constructor
     */
    constructor () {
        this.socket = new WS()

        this.init()
        this.sockets()
        this.onLoad()

        return this
    }

    /**
     * Class initialization
     */
    init () {
        this.options = {}

        // DOM Elements
        this.elements = {
            list: '.toasts',
            mustache: {
                tpl: '#mustache-toast',
                fields: {
                    ttl: '.mechanic-ttl',
                },
            },
        }

        // Supported Encounters
        this.encounters = [
            `Eden's Gate: Resurrection (Savage)`,
            `Eden's Gate: Descent (Savage)`,
        ]

        // Combat log
        this.combat = {
            active: null,
            encounter: {
                script: null,
                mechanics: [],
                elapsed: 0,
            },
            time: {
                t: 0,
                formatted: '00:00',
            },
        }

        this.timer = null

        // Socket Events
        this.events = {
            onCombatData: this._onCombatData.bind(this),
        }
    }

    /**
     * DOM Event Listeners
     * @return {Boolean}
     */
    listeners () {
        // Prevent reassigning duplicate listeners
        if (!this.socket.settings.first_connect) return false

        const that = this

        $(document)
            // OverlayPlugin
            .on('onOverlayStateUpdate', (e) => {
                $('body').removeClass('debug')

                if (e.detail.isLocked) $('body').removeClass('resize')
                else $('body').addClass('resize')
            })
            // Overlay Plugin
            .on('onOverlayDataUpdate', (e) => {
                if (!this.socket.ready) this.events.onCombatData(e.detail)
            })
    }

    /**
    * Socket Events
    */
    sockets () {
        // Connect
        this.socket.connect()

        // this.socket.subscribe('SendCharName', this.events.onSendCharName)
        this.socket.subscribe('CombatData', this.events.onCombatData)
    }

    /**
     * Window Load
     */
    onLoad () {
        this.listeners()
    }

    // Events
    /**
     * @return {Boolean}
     */
    async update () {
        // No support encounter was loaded
        if (!this.combat.encounter) return true

        // Only proceed if there are any mechanics
        if (!this.combat.encounter.script.length) return true

        let next_mechanic = true

        this.combat.encounter.elapsed++

        while (next_mechanic) {
            // Only proceed if there are any mechanics
            if (!this.combat.encounter.script.length) break

            const
                entry = this.combat.encounter.script[0],
                timestamp = this._convertTimestamp(entry.t)

            // Do not create a message until you're within range of the cast time
            if (this.combat.encounter.elapsed < timestamp - this.combat.encounter.mechanics[entry.mechanic].ttl) {
                next_mechanic = false
                continue
            }

            const $tpl = this._createTemplate({
                mechanic: this.combat.encounter.mechanics[entry.mechanic],
                ttl_ms: () => {
                    return this.combat.encounter.mechanics[entry.mechanic].ttl * 1000
                },
                get_i: () => {
                    if (Utils.getObjValue(this.combat.encounter.mechanics[entry.mechanic], 'i')) return this.combat.encounter.mechanics[entry.mechanic].i
                    return this.combat.encounter.i
                },
            })

            // Remove entry to avoid repeats
            this.combat.encounter.script.shift()
        }

        return true
    }

    /**
     * 
     * @param {String} zone 
     */
    async encounter (zone) {
        const slug = Utils.slugify(zone)

        try {
            if (!this.encounters.includes(zone)) throw new Error(`${zone} is not (yet) supported by Kyaputen.`)
            const json = await $.getJSON(`public/javascripts/encounters/${slug}.json`)

            this.combat.encounter = json
            this.combat.encounter.elapsed = this.combat.time.t
        } catch (err) {
            console.log(err)

            // this._createTemplate({
            //     mechanic: {
            //         name: 'Unsupported Encounter',
            //         type: 'Warning',
            //         message: `${zone} is not (yet) supported by Kyaputen`,
            //         ttl: 0,
            //     },
            //     ttl_ms: 5000,
            //     get_i: 'https://xivapi.com/i/061000/061804.png',
            // })

            this.combat.encounter = null
        }
    }

    /**
     * 
     * @param {Object} opts 
     * @return {Object}
     */
    _createTemplate (opts) {
        try {
            const $tpl = $(Mustache.render($(`${this.elements.mustache.tpl}`).html(), opts))

            $tpl.toast()
            $(this.elements.list).append($tpl)
            $tpl.toast('show')

            return $tpl
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * 
     * @param {String} str 
     * @return {Number}
     */
    _convertTimestamp (str) {
        const [min, sec] = str.split(':')
        return (+min * 60) + +sec
    }

    /**
     * Handles a CombatData event
     * @param {Object} data 
     */
    _onCombatData ({ Combatant: combatants, Encounter: encounter, isActive: active }) {
        // Convert all types to Boolean
        active = String(active).toString().toLowerCase() == 'true'

        // TODO: Create history if new encounter
        if (!this.combat.active && active) {
            console.log(`Combat begins: ${encounter.title}`)

            // Start new combat
            this.combat = {
                active: active,
                encounter: {},
            }

            // Load the script
            this.encounter(encounter.CurrentZoneName)

            // Update the DOM every second
            this.timer = setInterval(() => {
                this.update()
            }, 1000)
        }

        // Start new combat
        this.combat.active = active,
        this.combat.time = {
            t: +encounter.DURATION,
            formatted: encounter.duration,
        }

        if (active == false) {
            console.log(`Combat ends: ${encounter.title}`)

            clearInterval(this.timer)
            this.timer = null

            $(this.elements.list).empty()
        }
    }
}

new SonshoDashboard()