/**
 * KyaputenDashboard
 * @class
 */
class KyaputenDashboard {
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
        this.options = {
            encounter: {
                path: `/public/javascripts/encounters/`,
            },
        }

        // DOM Elements
        this.elements = {
            container: '.toast',
            list: '.content ul',
            ttl: '.ttl',
            mustache: {
                tpl: `#mustache-toast`,
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
     * @param {String} tpl
     */
    createTimeline (tpl) {
        for (const entry of this.combat.encounter.script) {
            const $tpl = $(Mustache.render($(`${tpl}`).html(), {
                mechanic: this.combat.encounter.mechanics[entry.mechanic],
                ttl: this._convertTTL(entry.t),
            }))

            $(this.elements.list).append($tpl)
        }

        $(this.elements.container).addClass('show')
    }

    /**
     * @return {Boolean}
     */
    async update () {
        // No support encounter was loaded
        if (!this.combat.encounter) return true

        // Only proceed if there are any mechanics
        if (!$(this.elements.list).children().length) return true

        const saves = []

        this.combat.encounter.elapsed++

        for (const entry of $(this.elements.list).children('.show')) {
            saves.push(new Promise((resolve, reject) => {
                const
                    $list = $(this.elements.list),
                    $entry = $(entry),
                    $ttl = $(this.elements.ttl, $entry),
                    ttl = +$ttl.text() - 1
                if (ttl) {
                    $ttl.text(ttl)
                } else {
                    const amt = $list.get(0).style.transform.length ?
                        +$list.get(0).style.transform.slice(11, -3) :
                        0

                    $list.css('transform', `translateY(${amt - 32}px)`)
                    $entry.toggleClass('show hide')
                }

                resolve()
            }))
        }

        await Promise.all(saves)

        return true
    }

    /**
     * 
     * @param {String} zone 
     */
    async encounter (zone) {
        // zone = `Eden's Gate: Resurrection (Savage)` // Debug
        const
            slug = Utils.slugify(zone),
            job = /(job\/\w{3})/.exec(window.location.href),
            path = Array.isArray(job) ? `${this.options.encounter.path}${job[0]}/` : this.options.encounter.path,
            tpl = `${this.elements.mustache.tpl}${Array.isArray(job) ? '-job' : '-timeline'}`

        try {
            if (!this.encounters.includes(zone)) throw new Error(`${zone} is not (yet) supported by Kyaputen.`)

            const json = await $.getJSON(`${path}${slug}.json`)

            this.combat.encounter = json
            this.combat.encounter.elapsed = this.combat.time.t

            this.createTimeline(tpl)
        } catch (err) {
            console.log(err)
            this.combat.encounter = null

            this._reset()
        }
    }

    /**
     * 
     * @param {String} str 
     * @return {Number}
     */
    _convertTTL (str) {
        const [min, sec] = str.split(':')
        return (+min * 60) + +sec
    }

    /**
     * 
     */
    _reset () {
        console.log(`Combat ends: ${this.combat.title}`)

        clearInterval(this.timer)
        this.timer = null

        $(this.elements.container).removeClass('show')
        $(this.elements.list).empty().removeAttr('style')
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
            // Start new combat
            this.combat = {
                active: active,
                title: encounter.title,
                encounter: {},
            }

            console.log(`Combat begins: ${this.combat.title}`)

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

        if (active == false) this._reset()
    }
}

new KyaputenDashboard()