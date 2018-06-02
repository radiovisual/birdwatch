import {EventEmitter} from 'events';
import objectAssign from 'object-assign';
import hashRegex from 'hash-regex';
import isRegexp from 'is-regexp';
import getPort from 'get-port';
import report from './report';

require('dotenv').config({
	path: '.env',
	silent: true
});

export default class Birdwatch {
	/**
	 * Initialize a new Birdwatch
	 *
	 * @param {Object} options - the Birdwatch options
	 * @api public
	 */
	constructor(options) {
		const defaults = {
			logReports: true,
			server: true,
			port: 8417,
			testData: false,
			refreshTime: 600,
			url: '/birdwatch/tweets',
			cacheDir: `${__dirname}/cache`,
			tweetPatchOptions: {
				stripTrailingUrl: true,
				hrefProps: 'target="_blank"'
			},
			sortBy: tweet => {
				return new Date(tweet.created_at) * -1;
			}
		};

		this.options = objectAssign(defaults, options);

		if (typeof this.options.sortBy !== 'function') {
			throw new TypeError(`sortBy value must be a function.`);
		}

		this.feeds = [];
		this.allTweets = [];
		this.filteredTweets = [];
		this.tweets = [];
	}

	/**
	 * Get or set the feeds to monitor
	 *
	 * @param {String} screenname - the Twitter screenname
	 * @param {Object} options - the feed options
	 * @returns {Object} the Birdwatch instance
	 * @api public
	 */
	feed(screenname, options) {
		if (arguments.length === 0) {
			return this._feed;
		}

		this._feed = this._feed || [];
		options = options || {};
		options.limit = options.limit || 12;

		this._feed.push({
			screenname,
			options
		});

		return this;
	}

	/**
	 * Get feeds from a Twitter list
	 *
	 * @param {String} listName - the name of the Twitter list
	 * @param {String} listOwner - the list owner's screename
	 * @param {Object} options - the feed options
	 * @returns {Object} the Birdwatch instance
	 * @api public
	 */
	feedsFromList(listName, listOwner, options) {
		if (arguments.length === 0) {
			return this._feedLists;
		}

		this._feedLists = this._feedLists || [];
		options = options || {};

		this._feedLists.push({
			listName,
			listOwner,
			options
		});

		return this;
	}

	/**
	 * Start the birdwatch process.
	 *
	 * @api public
	 * @returns {*} Promise
	 */
	async start() {
		const self = this;

		await getPort().then(port => {
			if (self.options.port === 0) {
				this.options.port = port;
			}
		});

		if ((!this.feed() && !this.feedsFromList()) || ((this.feed().length === 0 && this.feedsFromList().length === 0))) {
			throw new Error('You must supply at least one feed or list to Birdwatch');
		}

		const feedsFromList = await self.processFeedsFromList();

		report.logStartMessage(self.options.refreshTime, self);

		await Promise.all(self.feed().map(feed => {
			const options = objectAssign({}, self.options, feed.options);

			if (!feed.screenname) {
				throw new Error('Screenname required');
			}

			if (options.filterTags) {
				if (Array.isArray(options.filterTags)) {
					options.filterTags = hashRegex(options.filterTags);
				} else if (!isRegexp(options.filterTags)) {
					console.log({filterTags: options.filterTags, feed, isvalid: isRegexp(options.filterTags)});
					throw new TypeError(`Invalid regex: ${options.filterTags} for ${feed.screenname}`);
				}
			}
			self.feeds.push({
				screenname: feed.screenname,
				options
			});
			return Promise.resolve();
		}));

		await self.processFeeds(self.feeds, feedsFromList);

		// Now setup the interval that will incrementally update the cache.
		setInterval(async () => {
			const feedsFromList = await self.processFeedsFromList();

			await self.processFeeds(self.feeds, feedsFromList);
			await self.sortTweets();
			await self.saveToCacheFile();
		}, self.options.refreshTime * 1000);

		if (self.options.server) {
			await self.startServer();
		}
		return Promise.resolve(self.tweets);
	}
}
objectAssign(Birdwatch.prototype, EventEmitter.prototype);
objectAssign(Birdwatch.prototype, require('./utils.js'));
objectAssign(Birdwatch.prototype, require('./report.js'));
