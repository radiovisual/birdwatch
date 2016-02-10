import objectAssign from 'object-assign';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
import mkdirp from 'mkdirp';
import report from './report';
import OAuth from 'oauth';
import path from 'path';
import fs from 'fs';
import eachAsync from 'each-async';
import pify from 'pify';
import x from 'xmark';

const server = require('express')();

/**
 * Process the feeds by starting the promise chain.
 *
 * @param {Array} feeds		- the list of feeds to process
 */

export async function processFeeds(feeds) {
	const self = this;

	self.filteredTweets = [];
	self.allTweets = [];

    // Let's go Birdwatching!
	if (self.options.logReports) {
		report.processBirdwatchingMessage();
	}

	return await new Promise(resolve => {
		eachAsync(feeds, async (feed, index, done) => {

			const options = objectAssign({}, self.options, feed.options);
			const screenname = feed.screenname;

			x(1);
			await self.getTwitterData(screenname, options);
			x(2);
			await self.filterTweets(screenname, options);
			x(3);
			done();

		}, async (error) => {
			if (error) {
				throw (error);
			}
			console.log('done!');
			await self.sortTweets();
			await self.saveToCacheFile();
			resolve();
		});
	});
}

/**
 * Get tweets straight from the Twitter REST API.
 *
 * @param screenname	- Screenname of the requested Twitter user.
 * @param options 		- Birdwatch options
 * @returns {Promise}
 */

export function getTwitterData(screenname, options) {
	const self = this;

	if (options.logReports) {
		report.reportFetchingMessage(screenname, options.filterTags);
	}

	return new Promise((resolve, reject) => {
		if (options.testData) {
			self.allTweets = options.testData;
			resolve();
		}

		const credentials = getCredentials();

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
				self.allTweets = JSON.parse(data);
				resolve();
			}
		);
	});
}

/**
 * Filter the tweets if filtering options are supplied.
 *
 * @param {String} screenname       - the screenname of the current feed
 * @param {Object} options      	- the feed options
 * @returns {Promise}
 */

export async function filterTweets(screenname, options) {
	const self = this;
	const limit = options.limit;
	let count = 0;

	const tweetdata = self.allTweets;

	return await new Promise(resolve => {
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
		console.log('sort tweets length: ', sorted.length);
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
		self.tweets = await self.sortTweets();
		self.saveToCacheFile();
	}, self.options.refreshTime * 1000);
}

/**
 * Save the processed tweets to the on-disk cache
 *
 */

export function saveToCacheFile() {
	const self = this;

	return new Promise(async (resolve, reject) => {
		await pify(mkdir)(path.dirname(path));

		fs.writeFile(self.options.cacheFile, JSON.stringify(self.tweets), err => {
			if (err) {
				reject(err);
			}
			console.log('cache file saved!');
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

	const listener = server.listen(self.options.port);
	self.options.assignedPort = listener.address().port;
	report.serverRunningOnPort(self.options.assignedPort);
}

/**
 * Get the Twitter Credentials. Favor environment variables, otherwise use the values local-config.js
 *
 * @returns {object}
 * @api private
 */

function getCredentials() {
	const env = {
		consumerKey: process.env.BIRDWATCH_TWITTER_CONSUMER_KEY,
		consumerSecret: process.env.BIRDWATCH_TWITTER_CONSUMER_SECRET,
		accessToken: process.env.BIRDWATCH_TWITTER_ACCESS_TOKEN,
		accessTokenSecret: process.env.BIRDWATCH_TWITTER_ACCESS_TOKEN_SECRET
	};

	const useEnv = (env.consumerKey && env.consumerSecret && env.accessToken && env.accessTokenSecret);

	if (useEnv) {
		console.log('serving from ENV');
		return env;
	}
	return require('./../local-config.js');
}
