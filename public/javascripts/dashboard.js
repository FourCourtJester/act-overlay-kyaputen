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
        this.debug = false
        this.actions = {}
        this.jobs = ['ACN', 'ARC', 'AST', 'BLM', 'BLU', 'BRD', 'CNJ', 'DNC', 'DRG', 'DRK', 'GLA', 'GNB', 'LNC', 'MCH', 'MNK', 'MRD', 'NIN', 'PLD', 'PGL', 'RDM', 'ROG', 'SAM', 'SCH', 'SMN', 'THM', 'WAR', 'WHM']

        this.options = {
            job: {
                current: null,
                regex: /(job\/\w{3})/,
            },
            encounter: {
                path: `${path}/javascripts/encounters/`,
                override: null,
            },
        }

        // Auto assign a job
        if (this.options.job.regex.test(window.location.href)) {
            this.options.job.current = this.options.job.regex.exec(window.location.href)[0]
        }

        // Auto assign a test encounter based upon querystring
        this.encounter.override = (new URLSearchParams(location.search)).get('z')

        // DOM Elements
        this.elements = {
            container: '.toast',
            list: '.content ul',
            buttons: '.btn-wrap',
            ttl: '.ttl',
            mustache: {
                tpl: `#mustache-toast`,
            },
        }

        // The clock
        this.timer = null

        // Supported Encounters
        this.encounters = {
            E1S: `Eden's Gate: Resurrection (Savage)`,
            E2S: `Eden's Gate: Descent (Savage)`,
        }

        // Combat log
        this.combat = {
            active: null,
            zone: null,
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

        $('button').on('click', function () {
            that.showPhase(Utils.getObjValue($(this).data('kyaputen'), 'phase'))
        })

        window.addEventListener('storage', (e) => {
            this.showPhase(e.newValue)
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
        // Assign listeners
        this.listeners()

        // Preload job actions
        if (this.options.job.current) this._preloadJobs()

        // Debug test
        if (this.debug) {
            this._onCombatData({
                Combatant: {},
                Encounter: {
                    DURATION: 0,
                    CurrentZoneName: `Eden's Gate: Resurrection (Savage)`,
                    duration: '00:00',
                    title: 'Debug Test Fight',
                },
                isActive: true,
            })
        }
    }

    // Events
    /**
     * @param {String} tpl
     */
    createTimeline (tpl) {
        // Create all entries of this encounter
        for (const entry of this.combat.encounter.script) {
            const
                mechanic = this.options.job.current ? this.actions[this.options.job.current][entry.mechanic] : this.combat.encounter.mechanics[entry.mechanic],
                $tpl = $(Mustache.render($(`${tpl}`).html(), {
                    mechanic: mechanic,
                    ttl: this._convertTTL(entry.t),
                    phase: Utils.getObjValue(entry, 'phase') || 1,
                }))

            $(this.elements.list).append($tpl)
        }

        // If this encounter is phased, dynamically hide all other phases than the first
        if (!Utils.getObjValue(this.combat.encounter, 'default.transition')) {
            $(this.elements.buttons).hide()
            $(this.elements.list).children().removeClass('d-none')
        }

        // Activate phase 1
        this.showPhase(1)

        // Show the timeline
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

        // Increase the encounter time
        this.combat.encounter.elapsed++

        if (Utils.getObjValue(this.combat.encounter, '.default.transition')) {
            if (this.combat.encounter.elapsed - this._convertTTL(this.combat.encounter.default.transition) == 0) {
                $(this.elements.buttons).children(':visible').eq(0).trigger('click')
            }
        }

        for (const entry of $(this.elements.list).children('.show')) {
            saves.push(new Promise((resolve, reject) => {
                const
                    $list = $(this.elements.list),
                    $entry = $(entry),
                    $ttl = $(this.elements.ttl, $entry),
                    ttl = +$ttl.text() - 1

                if (ttl >= 0) {
                    // Update the Time to Live
                    $ttl.text(ttl)
                } else {
                    // Hide the mechanic
                    const amt = $list.get(0).style.transform.length ?
                        +$list.get(0).style.transform.slice(11, -3) :
                        0

                    // Only animate if this mechanic hasn't been skipped
                    if (!$entry.hasClass('d-none')) $list.css('transform', `translateY(${amt - 32}px)`)

                    // Remove the entry from future consideration
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
     */
    async encounter () {
        const
            slug = Utils.slugify(this.combat.zone),
            path = this.options.job.current ? `${this.options.encounter.path}${this.options.job.current}/` : this.options.encounter.path,
            tpl = `${this.elements.mustache.tpl}${this.options.job.current ? '-job' : '-timeline'}`

        try {
            if (!Object.values(this.encounters).includes(this.combat.zone)) throw new Error(`${this.combat.zone} is not (yet) supported by Kyaputen.`)

            const json = await $.getJSON(`${path}${slug}.json`)

            this.combat.encounter = json
            this.combat.encounter.elapsed = this.combat.time.t

            this.createTimeline(tpl)
        } catch (err) {
            console.error(err)
            this.combat.encounter = null

            this._reset()
        }
    }

    /**
     * 
     */
    async adjustTimes () {
        const
            saves = [],
            diff = this.combat.encounter.elapsed - this._convertTTL(this.combat.encounter.default.transition)

        // Get every remaining mechanic and adjust the time by the differential listed in the encounter
        for (const entry of $(this.elements.list).children('.show')) {
            saves.push(new Promise((resolve, reject) => {
                const
                    $entry = $(entry),
                    $ttl = $(this.elements.ttl, $entry),
                    ttl = +$ttl.text() + diff

                $ttl.text(ttl)

                resolve()
            }))
        }

        await Promise.all(saves)

        return true
    }

    /**
     * 
     * @param {Number} ph 
     */
    showPhase (ph) {
        const $btns = $(this.elements.buttons).children()

        console.log('Show Phase ' + ph)

        $btns.eq(ph - 1).prevAll().addBack().removeClass('d-inline-block').addClass('d-none')
        if (ph < this.combat.encounter.default.phases) $btns.eq(ph - 1).next().removeClass('d-none').addClass('d-inline-block')

        localStorage.setItem(`kyaputen.${Object.keys(this.encounters).find((key) => this.encounters[key] == this.combat.zone)}`, ph)

        if (ph > 1) this.adjustTimes()

        $(this.elements.list)
            .removeAttr('style')
            .children().addClass('d-none')
            .filter(`.phase-${ph}`).removeClass('d-none')
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

        localStorage.removeItem(`kyaputen.${Object.keys(this.encounters).find((key) => this.encounters[key] == this.combat.zone)}`)

        $(this.elements.container).removeClass('show')
        $(this.elements.list).empty().removeAttr('style')
        $(this.elements.buttons).show().children().removeClass('d-inline-block').addClass('d-none')
    }

    /**
     * @return {Boolean}
     */
    _preloadJobs () {
        try {
            $.getJSON(`${this.options.encounter.path}${this.options.job.current}/actions.json`)
                .then((a) => {
                    this.actions[this.options.job.current] = a
                })
                .catch((err) => {
                    console.log(err)
                    return false
                })

            // All Jobs (future)
            // this.jobs.forEach((job) => {
            //     this.actions[job] = $.getJSON(`${this.options.encounter.path}job/${job}/actions.json`)
            // })

            return true
        } catch (err) {
            console.error(err)
            return false
        }
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
                zone: this.encounter.override ? this.encounters[this.encounter.override] : encounter.CurrentZoneName,
                title: encounter.title,
                encounter: {},
            }

            console.log(`Combat begins: ${this.combat.title}`)

            // Load the script
            this.encounter()

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