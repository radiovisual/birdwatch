/* eslint-disable prefer-promise-reject-errors */
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
	res.setHeader(
		'Access-Control-Allow-Headers',
		'X-Requested-With,content-type'
	);

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
 * @param {Array} feedsFromList - the members of a Twitter list
 */
export async function processFeeds(feeds, feedsFromList) {
	const self = this;

	self.filteredTweets = [];
	self.allTweets = [];

	// Let's go Birdwatching!
	if (self.options.logReports) {
		report.processBirdwatchingMessage();
	}

	let allFeeds = [...feeds];

	if (
		feedsFromList &&
		Array.isArray(feedsFromList) &&
		feedsFromList.length > 0
	) {
		allFeeds = [...feeds, ...Array.prototype.concat(...feedsFromList)];
	}

	await Promise.all(
		allFeeds.map((feed, index) => {
			return new Promise(async (resolve, reject) => {
				const options = objectAssign({}, self.options, feed.options);
				const { screenname } = feed;

				await self
					.getTwitterData(screenname, options)
					.then(async () => {
						await self.filterTweets(screenname, options);
						await self.sortTweets();

						if (index === feeds.length - 1) {
							await self.saveToCacheFile();
						}
						resolve(self.tweets);
					})
					.catch(err => {
						reject(err);
					});
			});
		})
	);
}

/**
 * Get a list of members from a public Twitter list
 *
 * @param {String} listName - the Twitter list name
 * @param {String} listOwner - the screename of the Twitter list owner
 * @returns {*} Promise
 */
export async function fetchFeedsFromTwitterList(listName, listOwner) {
	const api = `https://api.twitter.com/1.1/lists/members.json?slug=${listName}&owner_id=${listOwner}&owner_screen_name=${listOwner}&count=200`;

	return new Promise((resolve, reject) => {
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
			api,
			credentials.accessToken,
			credentials.accessTokenSecret,
			(err, data) => {
				if (err) {
					if (err.statusCode === 404) {
						reject('404 Error');
					} else {
						reject(new OAuthError(err));
					}
				} else {
					resolve(data);
				}
			}
		);
	});
}

/**
 * Get tweets straight from the Twitter REST API.
 *
 * @param {String} screenname - Screenname of the requested Twitter user.
 * @param {Object} options - Birdwatch options
 * @returns {*} Promise
 */
export function getTwitterData(screenname, options) {
	const self = this;

	if (self.options.logReports) {
		report.reportFetchingMessage(screenname, options.filterTags);
	}

	return new Promise((resolve, reject) => {
		// A we using testData, or need real Twitter data?
		// TODO: remove this and just mock the Twitter API
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
 * @returns {*} Promise
 */
export function filterTweets(screenname, options) {
	const self = this;
	const { limit } = options;
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
 * @returns {*} Promise
 */
export function sortTweets() {
	const self = this;

	return new Promise(resolve => {
		let sorted;

		if (self.options.balancedScreennames === true) {
			sorted = self.sortedByScreenname(self.filteredTweets);
		} else {
			sorted = underscore.sortBy(self.filteredTweets, self.options.sortBy);
		}

		self.tweets = sorted;
		resolve(sorted);
	});
}

/**
 * Sort (balance) the tweets by their screenames
 *
 * It will turn a list of screen_names like:
 * 		userA, userA, userB, userB
 * into this:
 * 		userA, userB, userA, userB
 *
 * @param {Array} tweets
 * @returns {Array}
 */
export function sortedByScreenname() {
	const self = this;
	// first step is to sort the tweets based on the the username
	const sorted = underscore.sortBy(
		self.filteredTweets,
		tweet => tweet.user.screen_name
	);

	// Now let's iterate over the list and determine how many unique screenames we have
	// by sorting by screennames
	const uniqueUsers = {};

	sorted.forEach(tweet => {
		const screen_name = tweet.user.screen_name;
		if (!uniqueUsers[screen_name]) {
			uniqueUsers[screen_name] = { count: 1 };
		} else {
			uniqueUsers[screen_name].count = uniqueUsers[screen_name].count + 1;
		}
	});

	// Now we know how many unique users we have
	const uniqueUsersCount = Object.keys(uniqueUsers).length;

	// Now let's walk down the line and assign a unique value to each tweet, which
	// will then let us sort in a way that returns each screenname in order
	let currentName = Object.keys(uniqueUsers)[0];
	let currentNameIndex = 1;
	let index = 1;
	const newTweets = [];

	sorted.forEach(tweet => {
		const screen_name = tweet.user.screen_name;
		if (screen_name !== currentName) {
			// we must have hit a new user, so let's advance the currentNameIndex
			currentName = screen_name;
			currentNameIndex = currentNameIndex + 1;
			index = 1;
		}
		tweet.birdwatchUniqueUserPlacement =
			currentNameIndex + index * uniqueUsersCount;
		newTweets.push(tweet);
		index = index + 1;
	});

	// Now we can finally sort the tweets based on the new birdwatchUniqueUserPlacement value
	// that was injected into the tweet object
	const balancedUsers = underscore.sortBy(
		newTweets,
		tweet => tweet.birdwatchUniqueUserPlacement
	);

	return balancedUsers;
}

/**
 * @param {Object} listMembers - the raw list members data that comes from the Twitter API.
 * @returns {*} Promise
 */
export function listMembersToFeedEntries(listMembers) {
	const listObj = JSON.parse(listMembers);

	return Promise.all(
		listObj.users.map(user => {
			return Promise.resolve({
				screenname: user.screen_name,
				options: {
					limit: 20,
					removeRetweets: true
				}
			});
		})
	);
}

/**
 * Save the processed tweets to the on-disk cache
 * @returns {undefined} side effect: saves file to disk
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
 * Check to see if we need to find list members to add to the feed
 * @param {Array} feedsFromList - the list of members to turn into feeds
 * @returns {*} Promise
 */
export async function processFeedsFromList(feedsFromList) {
	if (feedsFromList && feedsFromList.length > 0) {
		return Promise.all(
			feedsFromList.map(async listData => {
				const { listName, listOwner } = listData;
				const listMembers = await fetchFeedsFromTwitterList(
					listName,
					listOwner
				);
				const members = await listMembersToFeedEntries(listMembers);

				return Promise.resolve(members);
			})
		);
	}
	return Promise.resolve('No feeds from list to process');
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
 * @returns {Object} credentials object
 */
export function getCredentials() {
	return {
		consumerKey: process.env.CONSUMER_KEY,
		consumerSecret: process.env.CONSUMER_SECRET,
		accessToken: process.env.ACCESS_TOKEN,
		accessTokenSecret: process.env.ACCESS_TOKEN_SECRET
	};
}
