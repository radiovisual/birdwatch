'use strict';
var credentials = require('./configure/local_configure');
var ctweets = require('./cache/cached_tweets.json');
var underscore = require('underscore');
var eachAsync = require('each-async');
var report = require("./report");
var chalk = require('chalk');
var Twit = require('twit');
var fs = require('fs');

// Polyfill Promise
require("native-promise-only");

// Setup the Twit object
var T = new Twit({
    consumer_key:         credentials.consumer_key,
    consumer_secret:      credentials.consumer_secret,
    access_token:         credentials.access_token,
    access_token_secret:  credentials.access_token_secret
});

var returned_tweets = [];

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds - the list of feeds to process
 * @param {Object} options - birdwatch configuration options
 * @param {Function} cb - callback
 */
exports.processFeeds = function(feeds, options, cb){

    // Let's go Birdwatching!
    report.processBirdwatchingMessage();

    eachAsync(feeds, function(item, index, next){

        var feedoptions = item.options;
        var screenname = item.screenname;

        var p = getTwitterData(screenname)
            .then(function(tweetdata){
            return filterTweets(tweetdata, screenname, feedoptions);
        }).then(function(){
            return processCache(feeds);
        }).then(function(processedCacheObjects){
            return sortTweets(processedCacheObjects);
        }).then(function(sorteddataobjects){
            saveCacheFile(sorteddataobjects);
        });

        p.catch(function(error){
            report.logError(error, false);
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
 * Request twitter data from the Twitter API
 *
 * @param {String} screenname - screenname associated to the feed
 * @returns {Promise}
 */

function getTwitterData(screenname){

    console.log("Fetching twitter data for: ", chalk.yellow("@"+screenname));

    return new Promise(function(resolve, reject){

        T.get("statuses/user_timeline", {screen_name: screenname},  function(err, reply){
            if (err){
                reject(Error(err));
            } else {
                resolve(reply);
            }
        });

    });
}

/**
 * Filter the tweets if filtering options are supplied.
 *
 * @param {Object} tweetdata        - the returned tweet data from Twitter
 * @param {String} screenname       - the screenname of the current feed
 * @param {Object} options          - the feed options
 * @returns {Promise}
 */

function filterTweets(tweetdata, screenname, options){

    return new Promise(function (resolve, reject){

        // return the unfiltered tweetdata if no filters are requested
        if( !options.hasOwnProperty("filter_tags") ){
            returned_tweets.push(tweetdata);
            resolve();

        // otherwise, return the filtered tweets
        } else {

            var matches = [];
            console.log(chalk.white.bold("Filtering "+screenname+": ") + chalk.gray(options.filter_tags));

            // is options.filter_tags a string or regex?
            var isRegEx = typeof(options.filter_tags) === 'object' && options.filter_tags.test;

            var search_tags;

            if(!isRegEx){
                reject(Error(["You must supply a regex to filter_tags\nCheck your syntax on: "+options.filter_tags]));
            }

            var remove_retweets =  options.hasOwnProperty("remove_retweets") && options.remove_retweets;

            for (var i in tweetdata){


                var tweet = tweetdata[i];
                var isRetweet = tweet.hasOwnProperty("retweeted_status");

                if(isRetweet && remove_retweets){
                    continue;
                }

                // TODO: HTML-ify tweet.text and add a HTMLtext property to the tweet object before saving.

                var tweet_str = tweet.text;
                if(options.filter_tags.test(tweet_str)){
                    matches.push(tweet);
                }
            }

            returned_tweets.push(matches);
            resolve();
        }

    });

}

/**
 * Break the data objects out of the returned_tweets array
 *
 * @param {Array} feeds
 * @returns {Promise}
 */

var processCache = function(feeds){

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
 * @param tweetObjects
 * @param options
 * @returns {Promise}
 */

var sortTweets = function(tweetObjects, options){

    return new Promise(function(resolve, reject){

        var sorted = underscore.sortBy(tweetObjects, function(tweet){
            return new Date(tweet.created_at)*-1;
        });

        resolve(sorted);

    });
};


/**
 * Save the processed tweets to the file cache
 *
 * @param {Object} dataToSave
 */

function saveCacheFile(dataToSave){

    fs.writeFile('./cache/cached_tweets.json', JSON.stringify(dataToSave), function (err) {
        if (err) {
            report.logError(["Error saving cached_tweets.json in processCache()", error]);
        } else {
            report.reportSuccessMessageWithTime("Cache file saved with "+dataToSave.length+" tweets");
            returned_tweets = [];
        }
    });
}

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







