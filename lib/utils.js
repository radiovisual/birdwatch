import credentials from './../birdwatch-config.js';
import testData from './../test/testTweets.json';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
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

			var p = getTwitterData(screenname, options)

			.then(tweets => {
				return self.filterTweets(tweets, screenname, options)
			})

			//p.then(filteredTweets => {
			//	return self.processCache(self.feeds, filteredTweets);
			//});

			.then(filteredTweets => {
				console.log(`${screenname} length from filteredTweets: ${filteredTweets.length}`);
				return sortTweets(filteredTweets);
			})

			.then(sortedTweets => {
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
 * @param screenname	- Screenname of the requested Twitter user.
 * @param options 		- Birdwatch options
 * @returns {Promise}
 */

export async function getTwitterData(screenname, options) {
	return new Promise((resolve, reject) => {

		if (options.useTestData){
			resolve(testData);
		}

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
			`https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${screenname}&include_rts=1&count=200`,
			credentials.access_token,
			credentials.access_token_secret,
			function(err,data,res) {
				if (err) {
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

export async function filterTweets(tweetdata, screenname, options) {
	console.log("filterTweets options: ", options);
	var self = this;

	return new Promise((resolve, reject) => {
            var matches = [];

            if (self.logReports) {
                report.reportFilteringMessage(screenname, options.filterTags);
            }

            for (var i in tweetdata) {

                var tweet = tweetdata[i];
                var isRetweet = tweet.retweeted_status;

				//console.log("working on: ", tweet.text);

                if (isRetweet && options.removeRetweets) {
                    continue;
                }

                tweet.html = tweet.html || tweetPatch(tweet);

				if (options.filterTags && options.filterTags.test(tweet.text)) {
					console.log(`${screenname} has a match to the regex. pushing tweet with regex: ${options.filterTags}`);
                    matches.push(tweet);
                } else if (!options.filterTags) {
					console.log(`${screenname} does not want to filter anything`);
                    matches.push(tweet);
                }
            }

			console.log(`matches for ${screenname} is done. It has a length of ${matches.length}`);
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

export async function processCache(feeds, tweets) {
	console.log(`checking: ${feeds.length} : ${tweets.length}`);
    return new Promise(function(resolve, reject) {

		resolve(tweets);
        // Are we ready to format the data?
        if (feeds.length === tweets.length){

            // break the objects out of the individual arrays
            var objects = [];
			tweets.forEach(function(item, index, array){
                item.forEach(function(item,index,array){
                    objects.push(item);
                });
            });

			console.log(`we are ready to process ${objects.length} tweets`);
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
 * @returns {Array}
 */

export function getCachedTweets() {
	return this.tweets;
}





