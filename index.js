'use strict';
var EventEmitter = require('events').EventEmitter;
var objectAssign = require('object-assign');
var eachAsync = require('each-async');
var report = require('./report');
var fs = require('fs');

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
    this.refreshTime = this.options.refreshTime || 300;
    this.logReports = this.options.logReports || false;
    this.useTestData = this.options.useTestData || false;
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

    if(!this.feed() || this.feed().length === 0){
        cb(new Error("You must supply at least one feed to Birdwatch"));
        return;
    }

    eachAsync(this.feed(), function(item, index, next){

        var options = item.options;

        if(!item.screenname || item.screenname.length === 0){
            cb(new Error('Screenname required'));
            return;
        }

        this.feeds.push({screenname:item.screenname, options:options});

        next();

    }.bind(this), function (error){

        if(error){
            cb(error);
            return;
        }

        if (this.logReports){
            report.logStartMessage(this.options, this.feeds);
        }

        this.processFeeds(this.feeds, this.options, cb);
        this.startTimer(this.feeds, this.options, cb);

    }.bind(this));

};




