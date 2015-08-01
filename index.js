'use strict';
var EventEmitter = require('events').EventEmitter;
var objectAssign = require('object-assign');
var eachAsync = require('each-async');
var report = require('./report');
var fs = require('fs');
var credentials;

// Do not proceed unless the configure/local_configure.js exists
if (!fs.existsSync("configure/local_configure.js")) {
    report.reportConfigFileMissingError();
} else {
    credentials = require('./configure/local_configure');
    // make sure that the credentials are not the default values
    report.checkCredentialsForDefaultValues(credentials);
}

/**
 * Initialize a new Birdwatch
 *
 * @param {Object} options
 * @constructor
 */

function Birdwatch(options){

    if(!(this instanceof Birdwatch)){
        return new Birdwatch(options);
    }

    EventEmitter.call(this);

    this.options = objectAssign({}, options);

    this.feeds = [];
    this.tweets = [];
    this.refreshTime = options.refreshTime || 300;

}

objectAssign(Birdwatch.prototype, EventEmitter.prototype);
objectAssign(Birdwatch.prototype, require('./utils'));

module.exports = Birdwatch;



/**
 * Get or set the feeds to monitor
 *
 * @param {String} screenname
 * @param {Object} options
 * @api public
 */

Birdwatch.prototype.feed = function(screenname, options){
    if(!arguments.length){
        return this._feed;
    }

    this._feed = this._feed || [];
    this._feed.push({
        screenname : screenname,
        options: options || {}
    });

    return this;
};


/**
 * Start the birdwatch process.
 *
 * @param {Function} cb - callback
 * @api public
 */
Birdwatch.prototype.start = function (cb){

    cb = cb || function () {};

    eachAsync(this.feed(), function(item, index, next){

        var birdwatch_opts = this.options;
        var options = item.options;

        if(!item.screenname || item.screenname.length === 0){
            // TODO: cb(new Error('screenname required on .feed()')); return;
            throw("Screenname value cannot be empty on a feed");
        }

        this.feeds.push({screenname:item.screenname, options:options});

        //console.log("get tweets for: ",item.screenname);
        //console.log(item.screenname, " has options supplied: ", item.options);

        next();

    }.bind(this), function (error){

        if(error){
            cb(error);
            return;
        }

        report.logStartMessage(this.options, this.feeds);
        this.processFeeds(this.feeds, this.options, cb);

    }.bind(this));

};

