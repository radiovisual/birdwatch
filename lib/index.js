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
	 * @param {Object} options
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
	 * @param {String} screenname
	 * @param {Object} options
	 * @api public
	 */
	feed(screenname, options) {
		if (!arguments.length) {
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
	 * Start the birdwatch process.
	 *
	 * @api public
	 */
	async start() {
		const self = this;

		await getPort().then(port => {
			if (self.options.port === 0) {
				this.options.port = port;
			}
		});

		if (!this.feed() || this.feed().length === 0) {
			throw new Error('You must supply at least one feed to Birdwatch');
		}

		report.logStartMessage(self.options.refreshTime, self);

		await Promise.all(this.feed().map(feed => {
			const options = objectAssign({}, self.options, feed.options);

			if (!feed.screenname) {
				throw new Error('Screenname required');
			}

			if (options.filterTags) {
				if (Array.isArray(options.filterTags)) {
					options.filterTags = hashRegex(options.filterTags);
				} else if (!isRegexp(options.filterTags)) {
					throw new Error(`Invalid regex: ${options.filterTags} for ${feed.screenname}`);
				}
			}
			self.feeds.push({
				screenname: feed.screenname,
				options
			});
			return Promise.resolve();
		}));

		await self.processFeeds(self.feeds, self.options);
		await self.startTimer(self.feeds, self.options);

		if (self.options.server) {
			await self.startServer();
		}
		return Promise.resolve(self.tweets);
	}
}
objectAssign(Birdwatch.prototype, EventEmitter.prototype);
objectAssign(Birdwatch.prototype, require('./utils.js'));
objectAssign(Birdwatch.prototype, require('./report.js'));
