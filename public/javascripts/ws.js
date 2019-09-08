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
        this.route = route || 'MiniParse'
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
                // setTimeout(() => {
                //     this.connect()
                // }, this.settings.reconnect.interval)
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
        if (!Object.prototype.hasOwnProperty.call(this.events, evt)) this.events[evt] = []

        // Duplicate event
        if (this.events[evt].filter((f) => f == cb).length) return true

        // Save the execution of this callback for this Web Socket
        this.events[evt].push(cb)

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

        if (Utils.in(Object.keys(this.events), packet.msgtype)) {
            for (const cb of this.events[packet.msgtype]) {
                cb(packet.msg)
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
        for (const q of location.search.substr(1).split('&')) {
            const parts = q.split('=')

            if (parts[0] !== 'HOST_PORT') continue
            return `${decodeURIComponent(parts[1].replace('[::1]', '[0000:0000:0000:0000:0000:0000:0000:0001]'))}${this.route}`
        }
    }
}