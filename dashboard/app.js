/* jshint node:true */

/**
 * Module dependencies.
 */
var express = require('express'),
    session = require("express-session"),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    bodyParser = require('body-parser');

var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'wilson dog ball' }));
app.use(bodyParser.json()); // support json encoded bodies

var dataviews = require('./dataviews.js');

// wrap all AJAX-used methods to do an XHR check to limit use from outside of
// our application:
app.use("/i/\*", function(req, res, next) {
    if (req.xhr === true) {
        next();
    } else {
        // reject API calls not from our application
        console.log("Non-Xhr request to API from: " + req.hostname + " (IP: " + req.ip + ")\nHeaders: " +
            "%j\nQuery: %j", req.headers, req.query);
        res.status(403).send("API access forbidden.");
    }
});

// called via AJAX method to query data from cloudant views
app.get("/i/devices", dataviews.deviceTotals);
app.get("/i/energy", dataviews.energyTotals);

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log('VDAthens Dashboard server listening on port ' + app.get('port'));
});

// handle signals properly for when running without init/shell in container:

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint() {
    console.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
    shutdown();
});

// quit properly on docker stop
process.on('SIGTERM', function onSigterm() {
    console.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
    shutdown();
});

// shut down server
function shutdown() {
    process.exit();
}