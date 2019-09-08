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
        this.elements = {}

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
        this.combat.encounter.elapsed++

        // Only proceed if there are any mechanics
        if (!this.combat.encounter.script.length) return true

        const
            entry = this.combat.encounter.script[0],
            timestamp = this._convertTimestamp(entry.t)

        // Do not create a message until you're within range of the cast time
        if (this.combat.encounter.elapsed < timestamp - this.combat.encounter.mechanics[entry.mechanic].ttl) return false

        // Send msg
        console.log(this.combat.encounter.mechanics[entry.mechanic].name, this.combat.encounter.mechanics[entry.mechanic].message)

        // Remove entry to avoid repeats
        this.combat.encounter.script.shift()

        return true
    }

    /**
     * 
     * @param {String} zone 
     */
    async encounter (slug) {
        const json = await $.getJSON(`public/javascripts/encounters/${slug}.json`)

        this.combat.encounter.script = json.script
        this.combat.encounter.mechanics = json.mechanics
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
            this.encounter('edens-gate-resurection-savage' || Utils.slugify(encounter.CurrentZoneName))

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
        this.combat.encounter.elapsed = this.combat.time.t

        if (active == false) {
            console.log(`Combat ends: ${encounter.title}`)

            clearInterval(this.timer)
            this.timer = null
        }
    }
}

new SonshoDashboard()