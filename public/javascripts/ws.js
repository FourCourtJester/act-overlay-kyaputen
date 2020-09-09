/**
 * The default Web Socket class
 * @class
 */
class WS {
    /**
     * @param {String} [route] - The route to the endpoint
     * @constructor
     */
    constructor (route = undefined) {
        this.ws = undefined
        this.route = route || 'ws'
        this.events = {}
        this.ready = false

        this.settings = {
            first_connect: true,
            reconnect: {
                interval: 5 * 1000,
            },
        }

        return this
    }

    /**
     * Connect the Web Socket to the Server
     * @return {Boolean}
     */
    connect () {
        try {
            // Initiate a new Web Socket
            this.ws = new WebSocket(this._url())

            // Error event
            this.ws.addEventListener('error', (err) => {
                throw err
            })

            // Open event
            this.ws.addEventListener('open', async () => {
                console.log('Socket has been opened')

                this.ready = true

                // Assign listening to passed events
                this.ws.addEventListener('message', (me) => {
                    this.parse(me.data)
                })
            })

            // Close event
            this.ws.addEventListener('close', async (ce) => {
                console.log('Socket has been closed', ce)

                // Cleanly reset the socket
                this.ws.close()
                this.ws = undefined

                // Set the first connect flag to false to trigger re-subscriptions
                this.settings.first_connect = false

                // TODO: Why does the socket auto disconnect sometimes?
                setTimeout(() => {
                    this.connect()
                }, this.settings.reconnect.interval)
            })

            return true
        } catch (err) {
            console.error(err)
            return false
        }
    }

    /**
     * Subscribes a function to an event
     * @param {String} evt - The event name
     * @param {Function} cb - The callback function
     * @return {Boolean}
     */
    subscribe (evt, cb) {
        if (!this.ready) {
            setTimeout(() => {
                this.subscribe(evt, cb)
            }, 500)

            return false
        }

        if (!Object.prototype.hasOwnProperty.call(this.events, evt)) this.events[evt] = []

        // Duplicate event
        if (this.events[evt].filter((f) => f == cb).length) return true

        // Save the execution of this callback for this Web Socket
        this.events[evt].push(cb)

        // Subscribe to the socket
        this._send(`Subscribe to ${evt}`, JSON.stringify({
            call: 'subscribe',
            events: [evt],
        }))

        return true
    }

    /**
     * Parses incoming messages
     * @param {Object} packet 
     * @return {Boolean}
     */
    parse (packet) {
        // Pong Event
        if (packet == '.') {
            this.ws.send('.')
            return true
        }

        packet = JSON.parse(packet)

        if (Utils.in(Object.keys(this.events), packet.type)) {
            for (const cb of this.events[packet.type]) {
                cb(packet)
            }
        } else {
            console.log('Received', packet)
        }

        return true
    }

    /**
         * Low level subscribe to the Web Socket Server
         * @param {String} evt
         * @param {Object} message
         * @return {Boolean}
         */
    _send (evt, message) {
        console.log('Sent', evt, message)
        this.ws.send(message)

        return true
    }

    /**
     * Send a message to the Web Socket Server
     * @param {String} evt 
     * @param {*} [message]
     */
    send (evt, message = {}) {
        this._send(evt, JSON.stringify({
            event: evt,
            message: message,
        }))
    }

    /**
     * Creates a valid Web Socket route
     * @return {String}
     */
    _url () {
        const q_string = new URLSearchParams(location.search)

        if (!q_string.has('HOST_PORT')) throw new Error('HOST_PORT is missing from connection information')
        return `${decodeURIComponent(q_string.get('HOST_PORT').replace('[::1]', '[0000:0000:0000:0000:0000:0000:0000:0001]'))}${this.route}`
    }
}