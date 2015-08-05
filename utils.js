'use strict';
var test_tweets = require("./test/test_tweets.js");
var tweetPatch = require("tweet-patch");
var underscore = require('underscore');
var eachAsync = require('each-async');
var isRegexp = require('is-regexp');
var fsAccess = require('fs-access');
var report = require("./report");
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var path = require("path");
var http = require('http');
var Twit = require('twit');
var fs = require('fs');

/*
* The credentials file to use for Twitter API authentication.
* This will be dynamically set in setupCredentials()
*
* @type {object} - The json object from birdwatch-config.js
*/
var credentials;

/*
* The Twit object used to access the Twitter API.
* This value will be dynamically assigned in setupCredentials()
*/
var twit;

// Polyfill Promise
require("native-promise-only");



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
 * @param {Object} bwoptions    - birdwatch configuration options
 * @param {Function} cb         - callback
 */

exports.processFeeds = function(feeds, bwoptions, cb){

    var self = this;

    // Let's go Birdwatching!
    if(this.logReports){
        report.processBirdwatchingMessage();
    }

    eachAsync(feeds, function(item, index, next){

        var feedoptions = item.options;
        var screenname = item.screenname;

        var p = self.setupCredentials(bwoptions).then(function(testmode){
            return self.getTwitterData(screenname, bwoptions, testmode);
        }).then(function(tweetdata){
            return self.filterTweets(tweetdata, screenname, feedoptions, bwoptions);
        }).then(function(){
            return self.processCache(feeds);
        }).then(function(processedCacheObjects){
            return self.sortTweets(processedCacheObjects);
        }).then(function(sorteddataobjects){
            self.saveToCache(sorteddataobjects, bwoptions);
        });

        p.catch(function(err){
            report.logError(err, false);
        });

        next();

    }.bind(this), function(err){
        if (err) {
            cb(err);
            return;
        }

        //console.log("Done loading feeds.");

    });

};




/**
 * Setup the credentials for the app.
 *
 * Do we have real credentials? Or are we testing?
 * Travis CI and Mocha shouldn't need valid credentials to test with,
 * so we use this promise to determine if we are in test mode or not.
 * This promise will return `true` if we are in test mode
 * (i.e, the birdwatch-config.js is not set or we want to use the test_tweet data),
 * and `false` if we in are in normal app mode.
 * This function also sets var credentials when in normal app mode.
 *
 * @param {object} bwoptions - the birdwatch configuration options
 * @returns {Promise}
 */

exports.setupCredentials = function(bwoptions){

    return new Promise(function(resolve, reject){

        if( bwoptions.useTestData ){
            console.log("bwoptions.useTestData == true, resolving `true` from setupCredentials()");
            resolve(true);
            return;

        } else {

            // get the birdwatch-config() file at the project root directory
            var configureFile = process.cwd() +"/birdwatch-config.js";

            fsAccess(configureFile, function(err){
                if(err) {
                    console.log("Error accessing "+configureFile+", resolving `true` from setupCredentials()");
                    resolve(true);
                } else {

                    credentials = require(configureFile);

                    twit = new Twit({
                        consumer_key:         credentials.consumer_key,
                        consumer_secret:      credentials.consumer_secret,
                        access_token:         credentials.access_token,
                        access_token_secret:  credentials.access_token_secret
                    });
                    console.log("Found birdwatch-config.js, resolving `false` from setupCredentials()");

                    resolve(false);
                }
            });

        }

    });

};


/**
 * Request twitter data from the Twitter API
 *
 * @param {String} screenname   - screenname associated to the feed
 * @param {Object} bwoptions    - birdwatch configuration options
 * @param {Boolean} testmode    - are we in test mode? If yes, serve test tweet data
 * @returns {Promise}
 */

exports.getTwitterData = function(screenname, bwoptions, testmode){

    if(bwoptions.logReports){
        console.log("Fetching twitter data for: ", chalk.yellow("@"+screenname));
    }

    return new Promise(function(resolve, reject){

        // Send test_tweets in testing environments
        if(testmode === true){

            resolve(test_tweets);

        } else {

            twit.get("statuses/user_timeline", {screen_name: screenname, count:200, include_rts:true},  function(err, reply){
                if (err){
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        }

    });
};


/**
 * Filter the tweets if filtering options are supplied.
 *
 * @param {Object} tweetdata        - the returned tweet data from Twitter
 * @param {String} screenname       - the screenname of the current feed
 * @param {Object} feedoptions      - the feed options
 * @param {Object} bwoptions        - birdwatch options
 * @returns {Promise}
 */

exports.filterTweets = function(tweetdata, screenname, feedoptions, bwoptions){

    return new Promise(function (resolve, reject){

            var matches = [];

            if(bwoptions.logReports){
                report.reportFilteringMessage(screenname, feedoptions.filterTags);
            }

            // is options.filterTags a regex?
            var isRegEx = isRegexp(feedoptions.filterTags);

            if(feedoptions.filterTags && !isRegEx){
                reject(new Error(["You must supply a regex to filterTags\nCheck your syntax on: "+feedoptions.filterTags]));
            }

            for (var i in tweetdata){

                var tweet = tweetdata[i];
                var isRetweet = tweet.retweeted_status;

                if(isRetweet && feedoptions.removeRetweets){
                    continue;
                }

                tweet.html = tweet.html || tweetPatch(tweet);

                if(feedoptions.filterTags && feedoptions.filterTags.test(tweet.text)){
                    matches.push(tweet);
                } else if (!feedoptions.filterTags) {
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
        if(feeds.length === returned_tweets.length){

            // break the objects out of the individual arrays
            var objects = [];
            returned_tweets.forEach(function(item, index, array){
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

exports.sortTweets = function(tweetObjects, options){

    return new Promise(function(resolve, reject){

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
 * @param {Object} bwoptions        - birdwatch configuration options
 */

exports.saveToCache = function(dataToSave, bwoptions){

    // TODO: Should this be in_memory_cache.push(dataToSave) ?
    in_memory_cache = dataToSave;

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
        self.processFeeds(feeds, options, cb);
    }, this.refreshTime*1000);
};


/**
 * Get the cached tweets object
 *
 * @discussion: returns in-memory if available, otherwise fallback to on-disk.
 * If the cache file does not exist, then return an empty json object
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
        if (in_memory_cache.length > 0){

            console.log("serving from in_memory_cache (before setTimer)");
            resolve(in_memory_cache);

        } else {

            setTimeout(function(){

                if(in_memory_cache.length > 0){

                    console.log("serving from in_memory_cache (after setTimer)");
                    resolve(in_memory_cache);

                } else {

                    fs.readFile(cacheFile, {encoding:'utf8'}, function(err, data){
                        if(err) {
                            console.log("Error reading cacheFile, returning: `[]`", err);
                            resolve([]);
                        } else {
                            console.log("serving from on-disk cache");
                            resolve(JSON.parse(data));
                        }
                    });

                }

            }, 1200);

        }
    });

};






