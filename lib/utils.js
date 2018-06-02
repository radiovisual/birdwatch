import fs from 'fs';
import path from 'path';

import OAuthError from 'node-oauth-error';
import objectAssign from 'object-assign';
import tweetPatch from 'tweet-patch';
import underscore from 'underscore';
import mkdirp from 'mkdirp';
import OAuth from 'oauth';
import pify from 'pify';
import report from './report';

const server = require('express')();

// ## CORS middleware
// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
// http://stackoverflow.com/questions/18310394/no-access-control-allow-origin-node-apache-port-issue
server.use((req, res, next) => {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware
	next();
});

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
 * Get a list of feeds from a public Twitter list
 *
 * @param {String} listUrl - the url to the public list of feeds
 */
export async function fetchFeedsFromTwitterList(listName, listOwner, options) {
	const self = this;
	const api = `https://api.twitter.com/1.1/lists/members.json?slug=${listName}&owner_id=${listOwner}&owner_screen_name=${listOwner}&count=200`;

	return new Promise((resolve, reject) => {
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
				api,
				credentials.accessToken,
				credentials.accessTokenSecret,
				(err, data) => {
					if (data && data.errors) {
						resolve(data);
					} else if (err) {
						if (err.statusCode === 404) {
							reject('404 Error');
						} else {
							reject(new OAuthError(err));
						}
					}
					resolve(data);
				}
			);
	});
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
					if (data && data.errors) {
						resolve();
					} else if (err) {
						if (err.statusCode === 404) {
							resolve();
						} else {
							reject(new OAuthError(err));
						}
					} else {
						self.allTweets = JSON.parse(data);
					}
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

				tweet.html = tweetPatch(tweet, self.options.tweetPatchOptions);

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
 * Sort the tweets
 *
 * @note: Defaults to chronological order if no custom function is supplied.
 * @param {Object} listMembers - the raw list members data that comes from the Twitter API.
 * @returns {Promise}
 */
export function listMembersToFeedEntries(listMembers) {
	const listObj = JSON.parse(listMembers);

	return Promise.all(listObj.users.map(user => {
		return Promise.resolve(user.screen_name);
	}));
}

/**
 * Start the interval timer based on this.refreshTime
 *
 * @note: seconds are converted to milliseconds
 * @param {Array} feeds - feeds to pass to this.processFeeds()
 */
export function startTimer(feeds) {
	const self = this;

	setInterval(async () => {
		await self.processFeeds(feeds);
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
 * Get the Twitter Credentials from environment variables
 *
 * @returns {object}
 * @api private
 */
export function getCredentials() {
	return {
		consumerKey: process.env.CONSUMER_KEY,
		consumerSecret: process.env.CONSUMER_SECRET,
		accessToken: process.env.ACCESS_TOKEN,
		accessTokenSecret: process.env.ACCESS_TOKEN_SECRET
	};
}
