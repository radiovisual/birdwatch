'use strict';
var credentials = require('./birdwatch-config.js');
var objectAssign = require('object-assign');
var tweetPatch = require("tweet-patch");
var underscore = require('underscore');
var eachAsync = require('each-async');
var isRegexp = require('is-regexp');
var fsAccess = require('fs-access');
var report = require("./report");
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var path = require("path");
var Twit = require('twit');
var fs = require('fs');

require("native-promise-only");

/*
* The Twit object used to access the Twitter API.
*/

var twit = new Twit(credentials);


/**
 * Temporarily hold the data that is returned from the promises
 * gathering the twitter data. When this array is full with all the
 * responses from twitter, saveToCache() uses it to create the in-memory
 * and on-disk caches. When the birdwatching cycle is over, this is emptied
 * and waits for the next birdwatching cycle to begin.
 * @type {Array}
 */
var returned_tweets = [];

/**
 * This will act as the in-memory cache, holding the jsondata
 * That will also be saved into the cached_tweets.json file.
 * We use an in-memory cache to increase response times, and reduce
 * the time needed to read from the disk. The on-disk cache is there
 * as a backup and will be used if the in-memory cache is empty
 * @type {Array}
 */
var in_memory_cache = [];

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds         - the list of feeds to process
 * @param {Function} cb         - callback
 */

exports.processFeeds = function(feeds, cb){

    returned_tweets = [];

    var self = this;

    // Let's go Birdwatching!
    if (self.logReports) {
        report.processBirdwatchingMessage();
    }

    eachAsync(feeds, function(item, index, next) {

		var options = objectAssign({}, self.options, item.options);
        var screenname = item.screenname;

        var p = self.getTwitterData(screenname);

		p.then(function(tweetdata) {
            return self.filterTweets(tweetdata, screenname, options);
        });

		p.then(function() {
            return self.processCache(feeds);
        });

		p.then(function(processedCacheObjects) {
            return self.sortTweets(processedCacheObjects);
        });

		p.then(function(sorteddataobjects) {
			in_memory_cache = sorteddataobjects;
            self.saveToCache(sorteddataobjects, options);
        });

        p.catch(function(err){
            report.logError(err, false);
        });

        next();

    }.bind(this), function(err){
        if (err) {
            cb(err);
        }

        //console.log("Done loading feeds.");

    });

};





/**
 * Request twitter data from the Twitter API
 *
 * @param {String} screenname   - screenname associated to the feed
 * @param {Object} options   - birdwatch and feed options
 * @returns {Promise}
 */

exports.getTwitterData = function (screenname, options) {
	if (this.logReports) {
		console.log('Fetching twitter data for: ', chalk.yellow('@' + screenname));
	}

	return new Promise(function (resolve, reject) {
		twit.get("statuses/user_timeline", {
			screen_name: screenname,
			count: 200,
			include_rts: true
		}, function (err, reply) {
			if (err) {
				reject(err);
			} else {
				resolve(reply);
			}
		});
	});
};


/**
 * Filter the tweets if filtering options are supplied.
 *
 * @param {Object} tweetdata        - the returned tweet data from Twitter
 * @param {String} screenname       - the screenname of the current feed
 * @param {Object} options      	- birdwatch and feed options
 * @returns {Promise}
 */

exports.filterTweets = function(tweetdata, screenname, options){

    return new Promise(function (resolve, reject){

            var matches = [];

            if (options.logReports) {
                report.reportFilteringMessage(screenname, options.filterTags);
            }

            // is options.filterTags a regex?
            var isRegEx = isRegexp(options.filterTags);

            if (options.filterTags && !isRegEx) {
                reject(new Error(["You must supply a regex to filterTags\nCheck your syntax on: "+options.filterTags]));
            }

            for (var i in tweetdata) {

                var tweet = tweetdata[i];
                var isRetweet = tweet.retweeted_status;

                if (isRetweet && options.removeRetweets){
                    continue;
                }

                tweet.html = tweet.html || tweetPatch(tweet);

                if (options.filterTags && options.filterTags.test(tweet.text)){
                    matches.push(tweet);
                } else if (!options.filterTags) {
                    matches.push(tweet);
                }
            }

            returned_tweets.push(matches);

            resolve();

    });

};


/**
 * Break the data objects out of the returned_tweets array
 *
 * @param {Array} feeds
 * @returns {Promise}
 */

exports.processCache = function(feeds){

    return new Promise(function(resolve, reject){

        // Are we ready to format the data?
        if (feeds.length === returned_tweets.length) {
            // break the objects out of the individual arrays
            var objects = [];
            returned_tweets.forEach(function(item, index, array) {
                item.forEach(function(item,index,array){
                    objects.push(item);
                });
            });

            resolve(objects);
        }
    });
};


/**
 * Sort the tweets
 *
 * @discussion: Defaults to chronological order. Custom sorting control coming soon
 * @param {Array} tweetObjects  - the tweet objects to sort
 * @param {Object} options      - TODO: allow custom sorting options
 * @returns {Promise}
 */

exports.sortTweets = function(tweetObjects, options) {

    return new Promise(function(resolve, reject) {

        var sorted = underscore.sortBy(tweetObjects, function(tweet){
            return new Date(tweet.created_at)*-1;
        });

        resolve(sorted);

    });
};


/**
 * Save the processed tweets to the cache
 *
 * @param {Object} dataToSave       - the data to save
 * @param {Object} options        	- birdwatch and feed options
 */

exports.saveToCache = function(dataToSave, options){

    // first check to see if the .cache_tweets file exists
    var cacheFile = __dirname + "/cache/cached_tweets.json";

    var getDirName = path.dirname;

    function writeFile(path, contents){
        mkdirp(getDirName(path), function(err){
            if(err) { console.error(err); }
            fs.writeFile(path, contents);
        })
    }

    writeFile(cacheFile, JSON.stringify(dataToSave));

};


/**
 * Start the interval timer based on this.refreshTime
 *
 * @note: seconds are converted to milliseconds
 * @param {Array} feeds - feeds to pass to this.processFeeds()
 * @param {Object} options - options to pass to this.processFeeds()
 * @param {Function} cb - callback to pass to this.processFeeds()
 */

exports.startTimer = function(feeds, options, cb){
    var self = this;
    setInterval(function(){
        self.processFeeds(feeds, cb);
    }, self.refreshTime*1000);
};


/**
 * Get the cached tweets object
 *
 * @returns {*} Promise
 */

exports.getCachedTweets = function(){

	var cacheFile = __dirname + "/cache/cached_tweets.json";

	return new Promise(function(resolve, reject){

		// TODO: Figure out a better way to serve the cached data.
		// See https://github.com/radiovisual/birdwatch/issues/4
		//
		// My current attempt is to add a setTimeout if the in-memory cache is not available
		// so that I give it one more chance to return from in-memory cache before resorting
		// to the disk. This at least gives the test_tweet data to make it into the in-memory
		// cache -- Which might let my test data be used in Mocha. However, I realize that this
		// makes first call to Birdwatch respond slowly. I know there is a better way, I just
		// haven't thought of it yet.
		//
		// IF YOU HAVE A BETTER IDEA, I WOULD LOVE SOME INPUT!
		//
		if (in_memory_cache.length > 0) {

			resolve (in_memory_cache);

		} else {

			//setTimeout(function(){

				if (in_memory_cache.length > 0) {

					console.log("serving from in_memory_cache (after setTimer)");
					resolve(in_memory_cache);

				} else {

					fs.readFile(cacheFile, {encoding:'utf8'}, function(err, data){
						if(err) {
							reject(err);
						} else {
							console.log("serving from on-disk cache");
							resolve(JSON.parse(data));
						}
					});

				}

			//}, 1200);

		}
	});

};





