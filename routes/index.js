const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra')

/* GET home page. */
router.get(['/', '/job/:job'], function (req, res, next) {
    // Render the page
    res.render('index', (err, html) => {
        // Disable caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1
        res.setHeader('Pragma', 'no-cache') // HTTP 1.0
        res.setHeader('Expires', '0') // Proxies

        // Development page
        res.send(html)

        // Public accessible page
        fs.writeFile('index.html', html)
    })
})

module.exports = router