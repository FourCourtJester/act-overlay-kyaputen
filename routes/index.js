const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra'),
    jobs = ['ACN', 'ARC', 'AST', 'BLM', 'BLU', 'BRD', 'CNJ', 'DNC', 'DRG', 'DRK', 'GLA', 'GNB', 'LNC', 'MCH', 'MNK', 'MRD', 'NIN', 'PLD', 'PGL', 'RDM', 'ROG', 'SAM', 'SCH', 'SMN', 'THM', 'WAR', 'WHM']

/* GET home page. */
router.get(['/'], function (req, res, next) {
    // Render the development page
    res.render('index', { is_development: true }, (err, html) => {
        // Disable caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1
        res.setHeader('Pragma', 'no-cache') // HTTP 1.0
        res.setHeader('Expires', '0') // Proxies

        // Development page
        res.send(html)
    })
})

module.exports = router