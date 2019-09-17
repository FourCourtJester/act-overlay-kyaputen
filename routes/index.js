const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra'),
    jobs = ['SCH']

/* GET home page. */
router.get(['/', '/job/:job'], function (req, res, next) {
    // Render the page
    res.render('index', (err, html) => {
        const dev_html = html
        // Disable caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1
        res.setHeader('Pragma', 'no-cache') // HTTP 1.0
        res.setHeader('Expires', '0') // Proxies

        html = html.replace('/public', '/act-overlay-kyaputen/public')

        // Public accessible page
        fs.writeFileSync('index.html', html)

        // Public accessible job pages
        jobs.forEach((job) => fs.copySync('index.html', `job/${job}/index.html`))

        // Development page
        res.send(dev_html)
    })
})

module.exports = router