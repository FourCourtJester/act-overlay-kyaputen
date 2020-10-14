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
        // Window ID
        this.id = location.hash ? location.hash.slice(1) : '1'

        this.cache = {}

        this.options = {
            authors: {},
            style: '',
            job: '',
        }

        this.settings = {
            papaparse: {
                download: true,
                dynamicTyping: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => Utils.slugify(header),
            },
        }

        this.path = {
            encounters: `${path}/javascripts/encounters`,
            jobs: `${path}/javascripts/jobs`,
        }

        // DOM Elements
        this.elements = {
            carousel: '.carousel',
            authors: '.job-authors',
            timeline: '.timeline ul',
            ttl: '.ttl',
            mustache: {
                author: '#mustache-entry-job-author',
                job: '#mustache-toast-job',
                boss: '#mustache-toast-boss',
            },
        }

        // The clock
        this.timer = null

        // Encounters
        this.supported_encounters = {
            E1S: `Eden's Gate: Resurrection (Savage)`,
            E2S: `Eden's Gate: Descent (Savage)`,
            E3S: `Eden's Gate: Inundation (Savage)`,
            E5S: `Eden's Verse: Fulmination (Savage)`,
            E6S: `Eden's Verse: Furor (Savage)`,
            E7S: `Eden's Verse: Iconoclasm (Savage)`,
            E8S: `Eden's Verse: Refulgence (Savage)`,
            UCOB: `The Unending Coil Of Bahamut (Ultimate)`,
            // Test: `Script Test`,
        }

        // Combat log
        this.combat = {
            active: null,
            zone: null,
            encounter: {},
            time: {
                t: 0,
                formatted: '00:00',
            },
        }

        // Debug
        // Zone Override
        this.zone = { override: (new URLSearchParams(location.search)).get('z') }

        // Socket Events
        this.events = {
            onCombatData: this._onCombatData.bind(this),
            onChat: this._onChat.bind(this),
        }
    }

    /**
     * DOM Event Listeners
     */
    listeners () {
        const that = this

        $(document)
            // OverlayPlugin
            .on('onOverlayStateUpdate', (e) => {
                if (e.detail.isLocked) {
                    $('body').removeClass('resize')
                } else {
                    if (!this.combat.active) {
                        $(this.elements.carousel).carousel(0)
                        $('body').addClass('active').removeClass('inactive')
                    }

                    $('body').addClass('resize')
                }
            })
            // Overlay Plugin
            .on('onOverlayDataUpdate', (e) => {
                if (!this.socket.ready) this.events.onCombatData(e.detail)
            })
            // Option Change
            .on('click', `.dropdown a`, (e) => {
                e.preventDefault()

                const
                    $a = $(e.target),
                    $select = $('form').find(`[name='${$a.parents('.dropdown-menu').data('target')}']`)

                $(e.target).parents('.dropdown').find('button').text($a.text())

                $select.val($(e.target).attr('href').slice(1))
                $select.trigger('change')
            })
            // Option Change - Job
            .on('change', `[name='job']`, (e) => {
                // Setup encounter authors
                this.getAuthors(e.target.value)
            })
            // Options Submit
            .on('submit', 'form', (e) => {
                e.preventDefault()

                const d = JSON.stringify($(e.target).serializeArray())

                localStorage.setItem(`kyaputen.${this.id}.options`, d)
                this.setOptions(d)

                return false
            })
    }

    /**
    * Socket Events
    */
    sockets () {
        // Connect
        this.socket.connect()

        this.socket.subscribe('CombatData', this.events.onCombatData)
        this.socket.subscribe('LogLine', this.events.onChat)
    }

    /**
     * Window Load
     */
    onLoad () {
        // Assign user defined saved options
        this.setOptions()

        // Assign listeners
        this.listeners()

        // Testing Combat out of Game
        // setTimeout(() => {
        //     this._onCombatData({
        //         Combatant: {},
        //         Encounter: {
        //             DURATION: 0,
        //             CurrentZoneName: `Eden's Gate: Descent (Savage)`,
        //             duration: '00:00',
        //             title: 'Debug Test Fight',
        //         },
        //         isActive: true,
        //     })
        // }, 2000)
    }

    /**
     * Sets all authors for all encounters
     * @param {String} job
     */
    async getAuthors (job) {
        try {
            this.cache.authors = Utils.getObjValue(this.cache, 'authors') || await $.getJSON(`${this.path.encounters}/manifest.json`)

            $(this.elements.authors).empty()

            for (const [encounter, scripts] of Object.entries(this.cache.authors)) {
                if (!Object.keys(scripts)) continue
                if (!Object.keys(scripts).includes(job)) continue

                for (const [, authors] of Object.entries(scripts[job])) {
                    const $tpl = $(Mustache.render($(`${this.elements.mustache.author}`).html(), {
                        job: job,
                        encounter: encounter,
                        authors: authors,
                    }))

                    $tpl.find('select').val(Utils.getObjValue(this.options.authors, encounter))

                    $(this.elements.authors).append($tpl)
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * Sets user defined options
     * @param {String} [d=null]
     * @return {Boolean}
     */
    setOptions (d = null) {
        if (!d) d = localStorage.getItem(`kyaputen.${this.id}.options`)
        if (!d) return false

        // Save the user options
        for (const { name: name, value: value } of JSON.parse(d)) {
            Utils.setObjValue(this.options, name, value)
            Utils.setElementValue($('form').find(`[name='${name}']`), value)
        }

        // Option: Style
        const styles = ['small-icons', 'medium-icons', 'large-icons']
        $('body').removeClass(styles).addClass(`${this.options.style}-icons`)

        if (Object.keys(this.options.authors)) this.getAuthors(this.options.job)

        this.unloadEncounter()

        return true
    }

    // Encounter Events

    /**
     * Loads a FFXIV Encounter
     */
    async loadEncounter () {
        try {
            const
                zone_slug = Utils.slugify(this.combat.zone || 'undefined'),
                zone_abbr = Utils.getObjKey(this.supported_encounters, this.combat.zone),
                files = []

            if (!this.supported_encounters[zone_abbr]) throw new Error(`${this.combat.zone} is not (yet) supported by Kyaputen.`)

            // Encounter Data
            files.push($.getJSON(`${this.path.encounters}/${zone_slug}/encounter.json`))

            // Either load the encounter actions or job actions
            if (this.options.job) {
                // Job Mechanics
                files.push(this.getCSV(`${this.path.jobs}/${this.options.job}.csv`, {
                    callback: (resolve, results) => {
                        resolve({
                            _id: 'job_actions',
                            mechanics: results.reduce((obj, entry) => {
                                obj[Utils.slugify(entry.name)] = entry
                                return obj
                            }, {}),
                        })
                    },
                }))

                // Job Timeline
                files.push(this.getCSV(`${this.path.encounters}/${zone_slug}/job/${this.options.job}/${Utils.slugify(this.options.authors[zone_abbr])}.csv`, {
                    callback: (resolve, results) => {
                        resolve({
                            _id: 'job_timeline',
                            timeline: results.map((entry) => {
                                entry.slug = Utils.slugify(entry.name)
                                return entry
                            }),
                        })
                    },
                }))
            } else {
                // Encounter Mechanics
                files.push(this.getCSV(`${this.path.encounters}/${zone_slug}/mechanics.csv`, {
                    callback: (resolve, results) => {
                        resolve({
                            _id: 'encounter_mechanics',
                            mechanics: results.reduce((obj, entry) => {
                                obj[entry.slug] = entry
                                return obj
                            }, {}),
                        })
                    },
                }))

                // Encounter Timeline
                files.push(this.getCSV(`${this.path.encounters}/${zone_slug}/timeline.csv`, {
                    callback: (resolve, results) => {
                        resolve({
                            _id: 'encounter_timeline',
                            timeline: results,
                        })
                    },
                }))
            }

            Promise
                .all(files)
                .then((loaded_files) => {
                    loaded_files.forEach((f) => {
                        switch (f._id) {
                        case 'encounter_mechanics':
                        case 'job_actions':
                            Utils.setObjValue(this.combat, 'encounter.mechanics', f.mechanics)
                            break

                        case 'encounter_description':
                            Utils.setObjValue(this.combat, 'encounter.phases', f.phases.map((p) => p == null ? null : new RegExp(p)))
                            break

                        case 'encounter_timeline':
                        case 'job_timeline':
                            Utils.setObjValue(this.combat, 'encounter.timeline', f.timeline)
                            break
                        }
                    })

                    this.createTimeline()
                })
                .catch((err) => {
                    throw err
                })
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * Unloads a FFXIV Encounter
     * @return {Boolean}
     */
    unloadEncounter () {
        // if (this.combat.title === undefined) return false

        console.log(`Combat ends: ${this.combat.title}`)

        clearInterval(this.timer)
        this.timer = null

        // localStorage.removeItem(`kyaputen.${this.id}.phase`)

        $('body').addClass('inactive').removeClass('active')
        $(this.elements.timeline).empty().removeAttr('style')

        return true
    }

    /**
     * Creates a timeline of events
     */
    createTimeline () {
        // Create all entries of this encounter
        for (const entry of this.combat.encounter.timeline) {
            const
                mechanic = this.combat.encounter.mechanics[entry.slug],
                tpl = this.elements.mustache[this.options.job ? 'job' : 'boss'],
                $tpl = $(Mustache.render($(`${tpl}`).html(), {
                    mechanic: mechanic,
                    ttl: this._convertTTL(entry.timestamp),
                    phase: +Utils.getObjValue(entry, 'phase') || 1,
                }))

            $(this.elements.timeline).append($tpl)
        }

        this.phase(1)
        $(this.elements.carousel).carousel(1)
        $('body').removeClass('inactive').addClass('active')
    }

    /**
     * Updates the timeline of events
     * @return {Boolean}
     */
    async updateTimeline () {
        // Only proceed if there are any mechanics
        if (!$(this.elements.timeline).children().length) return false

        const
            phase = Utils.getObjValue(this.combat, 'encounter.phase'),
            saves = []

        // Increase the encounter time
        this.combat.encounter.elapsed++

        for (const entry of $(this.elements.timeline).children(`.phase-${phase}.show`)) {
            saves.push(new Promise((resolve, reject) => {
                const
                    $entry = $(entry),
                    $ttl = $(this.elements.ttl, $entry),
                    ttl = +$ttl.text() - 1

                if (ttl >= 0) {
                    // Update the Time to Live
                    Utils.setElementValue($ttl, ttl)
                } else {
                    // Hide the mechanic
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
     * Activates an encounter phase
     * @param {Number} ph 
     */
    phase (ph) {
        if (ph) Utils.setObjValue(this.combat, 'encounter.phase', ph)
        else {
            this.combat.encounter.phase++
            this.combat.encounter.phases.shift()
        }

        console.log(`Combat Phase: ${this.combat.encounter.phase}`)

        $(this.elements.timeline)
            .removeAttr('style')
            .children().addClass('hide').removeClass('show')
            .filter(`.phase-${this.combat.encounter.phase}`).removeClass('hide').addClass('show')
    }

    // Assignments

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
     * @param {String} path 
     * @param {Object} opts
     * @param {Function} [opts.transformHeader]
     * @return {Promise}
     */
    getCSV (path, opts) {
        const config = this.settings.papaparse

        if (opts.transformHeader) config.transformHeader = opts.transformHeader

        return new Promise((resolve, reject) => {
            Papa.parse(path, Object.assign(config, {
                complete: (results) => opts.callback(resolve, results.data),
            }))
        })
    }

    // Socket Events

    /**
     * Handles a CombatData event
     * @return {Boolean}
     */
    async _onCombatData ({ type: type, Encounter: encounter, Combatant: combatants, isActive: active }) {
        // Convert all types to Boolean
        active = String(active).toString().toLowerCase() == 'true'

        // Start new combat
        if (!this.combat.active && active) {
            this.combat = {
                active: active,
                zone: this.zone.override ? this.supported_encounters[this.zone.override] : encounter.CurrentZoneName,
                title: encounter.title,
            }

            console.log(`Combat begins: ${this.combat.title}`)

            // Load the script
            this.loadEncounter()

            // Update the DOM every second
            this.timer = setInterval(() => {
                this.updateTimeline()
            }, 1000)
        }

        // Continue combat
        this.combat.active = active,
        this.combat.time = {
            t: +encounter.DURATION,
        }

        if (active == false) this.unloadEncounter()

        return true
    }

    /**
     * Handles a Chat event
     * @return {Boolean}
     */
    async _onChat ({ type: type, line: line, rawLine: raw }) {
        if (!Utils.getObjValue(this.combat, 'encounter.phases')) return false
        if (!this.combat.encounter.phases.length) return false

        if (this.combat.encounter.phases[0].test(raw)) Utils.debounce('phase', () => this.phase(), 500)

        return true
    }
}

new KyaputenDashboard()