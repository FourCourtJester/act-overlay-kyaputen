const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra')

/* GET home page. */
router.get(['/'],
    // Deliver the development version
    async (req, res, next) => {
        // Render the development page
        res.render('index', { is_development: true }, (err, html) => {
            // Disable caching
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1
            res.setHeader('Pragma', 'no-cache') // HTTP 1.0
            res.setHeader('Expires', '0') // Proxies

            // Development page
            res.send(html)
        })

        next()
    },
    // Create the public version
    async (req, res, next) => {
        res.render('index', { is_development: false }, (err, html) => {
            // Public accessible page
            fs.writeFileSync('index.html', html)
        })
    }
)

module.exports = router