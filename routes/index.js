const
    express = require('express'),
    router = express.Router(),
    fs = require('fs-extra')

/* GET home page. */
router.get('/', function (req, res, next) {
    const saves = []

    // related Node front end packages
    for (const module of [
        'jquery/dist/jquery.min.js',
        'bootstrap/dist/js/bootstrap.bundle.min.js',
        'mustache/mustache.min.js',
    ]) {
        saves.push(Promise.resolve(fs.copy(`node_modules/${module}`, `public/javascripts/dist/${module}`)))
    }

    Promise
        .all(saves)
        .then(() => {
            // Render the page
            res.render('index', (err, html) => {
                // Disable caching
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') // HTTP 1.1.
                res.setHeader('Pragma', 'no-cache') // HTTP 1.0.
                res.setHeader('Expires', '0') // Proxies.

                // Development page
                res.send(html)

                // Public accessible page
                fs.writeFile('index.html', html)
            })
        })
})

module.exports = router