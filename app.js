const
    express = require('express'),
    path = require('path'),
    createError = require('http-errors'),
    sassMiddleware = require('node-sass-middleware'),
    app = express()

// view engine setup
app.locals.basedir = __dirname // For PUG absolute paths
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// setup middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('serve-favicon')(path.join(__dirname, 'public', 'favicon.png')))
app.use(sassMiddleware({ src: __dirname, outputStyle: 'compressed' }))

// create paths
app.use('/public', express.static(path.join(__dirname, 'public')))

// routes
app.use('/', require('./routes/index'))

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message
    res.locals.error = req.app.get('env') === 'development' ? err : {}

    // render the error page
    res.status(err.status || 500)
    res.render('error')
})

module.exports = app