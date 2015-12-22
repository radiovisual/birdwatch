import getTwitterData from './gettweets.js';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
import isRegexp from 'is-regexp';
import fsAccess from 'fs-access';
import report from './report';
import mkdirp from 'mkdirp';
import chalk from 'chalk';
import path from 'path';
import pify from 'pify';
import fs from 'fs';
import Twit from 'twit';

/**
 * Temporarily hold the data that is returned from the promises
 * gathering the twitter data. When this array is full with all the
 * responses from twitter, saveToCache() uses it to create the in-memory
 * and on-disk caches. When the birdwatching cycle is over, this is emptied
 * and waits for the next birdwatching cycle to begin.
 * @type {Array}
 */
let returned_tweets = [];

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds         - the list of feeds to process
 * @param {Object} options    - birdwatch configuration options
 */

export async function processFeeds (feeds, options){

    returned_tweets = [];
    this.tweets = [];

    var self = this;

    // Let's go Birdwatching!
    if (self.logReports) {
        report.processBirdwatchingMessage();
    }

	await Promise.all(feeds.map(feed => {

		console.log('1');
		const screenname = feed.screenname;
		console.log('2: ', screenname);
		const options = feed.options;
		console.log('3');

		let p = getTwitterData(screenname);

		p.then(tweets => {
			console.log("4: ", tweets);
		});

		p.catch(error => {
			console.log(error);
		});


			//.then((tweets) => {
			//
			//	console.log(tweets);
			//})

			//	.then(() => {
			//	console.log('5');
			//	return this.filterTweets(tweetdata,screename,options)
			//}).then((filteredTweets) => {
			//	console.log('6');
			//	return this.sortTweets(filteredTweets)
			//}).then((sortedTweets) => {
			//	console.log('7');
			//	this.saveToCache(sortedTweets);
			//	resolve()
			//})

			//	.catch(error => {
			//	console.log('8: reject error');
			//	reject(error);
			//});


			//await this.filterTweets(tweetdata,screename,options);
			//console.log('5');
			//const processedTweets = this.processCache(feeds);
			//console.log('6');
			//const sortedTweets = await this.sortTweets(processedTweets);
			//console.log('7');
			//await this.saveToCache(sortedTweets);
			//console.log('8');
			//resolve();

	}));

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

	console.log("filterTweets options", options);

    return new Promise(function (resolve, reject){

            var matches = [];

            if (this.logReports) {
                report.reportFilteringMessage(screenname, options.filterTags);
            }

            // is options.filterTags a regex?
            var isRegEx = isRegexp(options.filterTags);

            if (options.filterTags && !isRegEx) {
				console.error("Check your regex syntax on: ${feedoptions.filterTags}");
                throw new Error('You must supply a valid regex to filterTags.');
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

            returned_tweets.push(matches);

            resolve();

    });

}


/**
 * Break the data objects out of the returned_tweets array
 *
 * @param {Array} feeds
 * @returns {Promise}
 */

export async function processCache(feeds){

    return new Promise(function(resolve, reject){

        // Are we ready to format the data?
        if (feeds.length === returned_tweets.length){

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

export async function saveToCache(dataToSave){

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
 * @returns {*} Promise
 */

export async function getCachedTweets() {
	return new Promise((resolve, reject) => {
		resolve(this.tweets);
	})
}






