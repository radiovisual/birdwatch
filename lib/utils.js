import fs from 'fs';
import path from 'path';

import OAuthError from 'node-oauth-error';
import objectAssign from 'object-assign';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
import mkdirp from 'mkdirp';
import OAuth from 'oauth';
import pify from 'pify';

const server = require('express')();
import report from './report';

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds - the list of feeds to process
 */
export async function processFeeds(feeds) {
	const self = this;

	self.filteredTweets = [];
	self.allTweets = [];

    // Let's go Birdwatching!
	if (self.options.logReports) {
		report.processBirdwatchingMessage();
	}

	await Promise.all(feeds.map((feed, index) => {
		return new Promise(async (resolve, reject) => {
			const options = objectAssign({}, self.options, feed.options);
			const screenname = feed.screenname;

			await self.getTwitterData(screenname, options).then(async () => {
				await self.filterTweets(screenname, options);
				await self.sortTweets();

				if (index === feeds.length - 1) {
					await self.saveToCacheFile();
				}
				resolve(self.tweets);
			}).catch(err => {
				reject(err);
			});
		});
	}));
}

/**
 * Get tweets straight from the Twitter REST API.
 *
 * @param screenname - Screenname of the requested Twitter user.
 * @param options - Birdwatch options
 * @returns {Promise}
 */
export function getTwitterData(screenname, options) {
	const self = this;

	if (self.options.logReports) {
		report.reportFetchingMessage(screenname, options.filterTags);
	}

	return new Promise((resolve, reject) => {
		// are we using testData, or need real Twitter data?
		if (options.testData) {
			self.allTweets = options.testData;
			resolve(self.allTweets);
		} else {
			const credentials = self.getCredentials();

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
						reject(new OAuthError(err));
					}
					self.allTweets = JSON.parse(data);
					resolve();
				}
			);
		}
	});
}

/**
 * Filter the tweets if filtering options are supplied.
 *
 * @param {String} screenname - the screenname of the current feed
 * @param {Object} options - the feed options
 * @returns {Promise}
 */
export function filterTweets(screenname, options) {
	const self = this;
	const limit = options.limit;
	let count = 0;

	const tweetdata = self.allTweets;

	return new Promise(resolve => {
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
					count++;
				} else if (!options.filterTags) {
					self.filteredTweets.push(tweet);
					count++;
				}

				if (count >= limit) {
					break;
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
export function sortTweets() {
	const self = this;
	return new Promise(resolve => {
		const sorted = underscore.sortBy(self.filteredTweets, self.options.sortBy);
		self.tweets = sorted;
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
		await self.sortTweets();
		await self.saveToCacheFile();
		return Promise.resolve();
	}, self.options.refreshTime * 1000);
}

/**
 * Save the processed tweets to the on-disk cache
 *
 */
export function saveToCacheFile() {
	const self = this;
	const file = path.join(self.options.cacheDir, 'cached_tweets.json');

	return new Promise(async (resolve, reject) => {
		await pify(mkdirp)(self.options.cacheDir);

		fs.writeFile(file, JSON.stringify(self.tweets), err => {
			if (err) {
				reject(err);
			}
			resolve();
		});
	});
}

/**
 * Start the birdwatch server
 *
 * @api private
 */
export function startServer() {
	const self = this;

	server.get(self.options.url, (req, res) => {
		res.json(self.tweets);
	});
	server.listen(self.options.port);
}

/**
 * Get the Twitter Credentials from local-config.js
 *
 * @returns {object}
 * @api private
 */
export function getCredentials() {
	return require(this.options.configFile);
}
