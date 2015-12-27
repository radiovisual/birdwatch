import credentials from './../birdwatch-config.js';
import testData from './../test/testTweets.json';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
import mkdirp from 'mkdirp';
import report from './report';
import OAuth from 'oauth';
import path from 'path';
import fs from 'fs';

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds		- the list of feeds to process
 */

export async function processFeeds(feeds) {
	const self = this;

	self.filteredTweets = [];

    // Let's go Birdwatching!
	if (self.logReports) {
		report.processBirdwatchingMessage();
	}

	await Promise.all(feeds.map(feed => {
		return new Promise(async (resolve, reject) => {
			const screenname = feed.screenname;
			const options = feed.options;

			const p = getTwitterData(screenname, options).then(tweets => {
				return self.filterTweets(tweets, screenname, options);
			}).then(resolve);

			p.catch(error => {
				reject(error);
			});
		});
	}));
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
		if (options.useTestData) {
			resolve(testData);
		}

		const oauth = new OAuth.OAuth(
			'https://api.twitter.com/oauth/request_token',
			'https://api.twitter.com/oauth/access_token',
			credentials.consumerKey,
			credentials.consumerSecret,
			'1.0A',
			null,
			'HMAC-SHA1'
		);

		oauth.get(
			`https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${screenname}&include_rts=1&count=200`,
			credentials.accessToken,
			credentials.accessTokenSecret,
			(err, data) => {
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
	const self = this;

	return new Promise(resolve => {
		if (self.logReports) {
			report.reportFilteringMessage(screenname, options.filterTags);
		}

		for (const i in tweetdata) {
			if ({}.hasOwnProperty.call(tweetdata, i)) {
				const tweet = tweetdata[i];
				const isRetweet = tweet.retweeted_status;

				if (isRetweet && options.removeRetweets) {
					continue;
				}

				tweet.html = tweet.html || tweetPatch(tweet);

				if (options.filterTags && options.filterTags.test(tweet.text)) {
					self.filteredTweets.push(tweet);
				} else if (!options.filterTags) {
					self.filteredTweets.push(tweet);
				}
			}
		}
		resolve(self.filteredTweets);
	});
}

/**
 * Sort the tweets
 *
 * @note: Defaults to chronological order if no custom function is supplied.
 * @returns {Promise}
 */

export async function sortTweets() {
	const self = this;

	const sortBy = self.options.sortBy || function (tweet) {
		return new Date(tweet.created_at) * -1;
	};

	if (typeof sortBy !== 'function') {
		throw new TypeError(`sortBy value must be a function.`);
	}

	return new Promise(resolve => {
		const sorted = underscore.sortBy(self.filteredTweets, sortBy);
		resolve(sorted);
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
	const self = this;

	setInterval(async () => {
		await self.processFeeds(feeds, options);
		self.tweets = await self.sortTweets();
		saveToCacheFile();
	}, self.refreshTime * 1000);
}

/**
 * Save the processed tweets to the on-disk cache
 *
 */

export function saveToCacheFile() {
	const self = this;

	const cacheFile = `${__dirname}/cache/cached_tweets.json`;
	const getDirName = path.dirname;

	function writeFile(path, contents) {
		mkdirp(getDirName(path), err => {
			if (err) {
				console.error(err);
			}
			fs.writeFile(path, contents);
		});
	}
	writeFile(cacheFile, JSON.stringify(self.tweets));
}

/**
 * Get the cached tweets object
 *
 * @returns {Array}
 */

export function getCachedTweets() {
	return this.tweets;
}
