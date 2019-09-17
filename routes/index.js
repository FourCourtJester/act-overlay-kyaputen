const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra'),
    jobs = ['ACN', 'ARC', 'AST', 'BLM', 'BLU', 'BRD', 'CNJ', 'DNC', 'DRG', 'DRK', 'GLA', 'GNB', 'LNC', 'MCH', 'MNK', 'MRD', 'NIN', 'PLD', 'PGL', 'RDM', 'ROG', 'SAM', 'SCH', 'SMN', 'THM', 'WAR', 'WHM']

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

        // Create relative path for Github
        html = html.replace(/\/public/g, '/act-overlay-kyaputen/public')

        // Public accessible page
        fs.writeFileSync('index.html', html)

        // Public accessible job pages
        jobs.forEach((job) => fs.copySync('index.html', `job/${job}/index.html`))
    })
})

module.exports = router