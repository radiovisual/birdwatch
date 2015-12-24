import credentials from './../birdwatch-config.js';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
import isRegexp from 'is-regexp';
import fsAccess from 'fs-access';
import report from './report';
import mkdirp from 'mkdirp';
import OAuth from 'oauth';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds		- the list of feeds to process
 * @param {Object} options	- birdwatch configuration options
 */

export async function processFeeds(feeds, options) {

    var self = this;

    // Let's go Birdwatching!
    if (self.logReports) {
        report.processBirdwatchingMessage();
    }

	await Promise.all(feeds.map(feed => {
		return new Promise(async (resolve, reject) => {

			const screenname = feed.screenname;
			const options = feed.options;

			var p = getTwitterData(screenname);

			p.then(tweets => {
				return self.filterTweets(tweets, screenname, options)
			});

			p.then(filteredTweets => {
				return self.processCache(self.feeds, filteredTweets);
			});

			p.then(allTweets => {
				return sortTweets(allTweets);
			});

			p.then(sortedTweets => {
				self.tweets = sortedTweets;
				resolve(self.tweets);
			});

			p.catch(error => {
				reject(error);
			});

		});
	}))
}

/**
 * Get tweets straight from the Twitter REST API.
 *
 * @param screenname
 * @returns {Promise}
 */

export async function getTwitterData(screenname){

	return new Promise((resolve, reject) => {

		let oauth = new OAuth.OAuth(
			'https://api.twitter.com/oauth/request_token',
			'https://api.twitter.com/oauth/access_token',
			credentials.consumer_key,
			credentials.consumer_secret,
			'1.0A',
			null,
			'HMAC-SHA1'
		);

		oauth.get(
			`https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${screenname}`,
			credentials.access_token,
			credentials.access_token_secret,
			function(err,data,res) {
				if (err){
					reject(err);
				}
				resolve(JSON.parse(data));
			}
		);

	});
}

/**
 * Filter the tweets if filtering options are supplied.
 *
 * @param {Object} tweetdata        - the returned tweet data from Twitter
 * @param {String} screenname       - the screenname of the current feed
 * @param {Object} options      	- the feed options
 * @returns {Promise}
 */

export async function filterTweets(tweetdata, screenname, options){

	//console.log("filterTweets options", options);

    return new Promise(function (resolve, reject){

            var matches = [];

            if (this.logReports) {
                report.reportFilteringMessage(screenname, options.filterTags);
            }

            // is options.filterTags a regex?
            var isRegEx = isRegexp(options.filterTags);

            if (options.filterTags && !isRegEx) {
                throw new Error(`Invalid regex: ${feedoptions.filterTags} for ${screenname}`);
            }

            for (var i in tweetdata) {

                var tweet = tweetdata[i];
                var isRetweet = tweet.retweeted_status;

                if (isRetweet && options.removeRetweets) {
                    continue;
                }

                tweet.html = tweet.html || tweetPatch(tweet);

                if (options.filterTags && options.filterTags.test(tweet.text)){
                    matches.push(tweet);
                } else if (!feedoptions.filterTags) {
                    matches.push(tweet);
                }
            }

            resolve(matches);

    });

}


/**
 * Break the data objects out of the returned_tweets array
 *
 * @param {Array} feeds 	- the feeds that birdwatch monitors
 * @param {Array} tweets 	- the returned tweets from twitter
 * @returns {Promise}
 */

export async function processCache(feeds, tweets){

    return new Promise(function(resolve, reject){

        // Are we ready to format the data?
        if (feeds.length === tweets.length){

            // break the objects out of the individual arrays
            var objects = [];
			tweets.forEach(function(item, index, array){
                item.forEach(function(item,index,array){
                    objects.push(item);
                });
            });

            resolve(objects);
        }
    });
}


/**
 * Sort the tweets
 *
 * @discussion: Defaults to chronological order. Custom sorting control coming soon
 * @param {Array} tweetObjects  - the tweet objects to sort
 * @param {Object} options      - TODO: allow custom sorting options
 * @returns {Promise}
 */

export async function sortTweets(tweetObjects, options) {
    return new Promise(function(resolve, reject){

        var sorted = underscore.sortBy(tweetObjects, function(tweet){
            return new Date(tweet.created_at)*-1;
        });

        resolve(sorted);

    });
}


/**
 * Save the processed tweets to the cache
 *
 * @param {Object} dataToSave       - the data to save
 */

export async function saveToCache(dataToSave) {

	this.tweets = dataToSave;

	return new Promise(async (resolve, reject) => {
		await pify(mkdirp)(path.dirname);

		fs.writeFile(this.cacheFile, JSON.stringify(dataToSave), (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(this.tweets);
			}
		})

	});
}


/**
 * Start the interval timer based on this.refreshTime
 *
 * @note: seconds are converted to milliseconds
 * @param {Array} feeds - feeds to pass to this.processFeeds()
 * @param {Object} options - options to pass to this.processFeeds()
 */

export function startTimer(feeds, options) {
    var self = this;
    setInterval(function(){
        self.processFeeds(feeds, options);
    }, self.refreshTime*1000);
}

/**
 * Get the cached tweets object
 *
 * @discussion: TODO: fallback to on-disk if this.tweets is empty
 *
 * @returns {Array}
 */

export function getCachedTweets() {
	return this.tweets;
}





