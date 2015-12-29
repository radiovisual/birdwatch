import objectAssign from 'object-assign';
import {EventEmitter} from 'events';
import isRegexp from 'is-regexp';
import report from './report';
import hashRegex from 'hash-regex';

export default class Birdwatch {
	/**
	 * Initialize a new Birdwatch
	 *
	 * @param {Object} options
	 * @api public
	 */

	constructor(options) {
		this.options = objectAssign({}, options);

		this.feeds = [];
		this.filteredTweets = [];
		this.tweets = [];
		this.refreshTime = this.options.refreshTime || 600;
		this.logReports = this.options.logReports || false;
		this.useTestData = this.options.useTestData || false;
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
		this._feed.push({screenname, options});

		return this;
	}

	/**
	 * Start the birdwatch process.
	 *
	 * @api public
	 */

	async start() {
		if (!this.feed() || this.feed().length === 0) {
			throw new Error('You must supply at least one feed to Birdwatch');
		}

		await Promise.all(this.feed().map(feed => {
			const options = objectAssign({}, this.options, feed.options);

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

			this.feeds.push({screenname: feed.screenname, options});
		}));

		if (this.logReports) {
			report.logStartMessage(this.refreshTime, this.feeds.length);
		}

		await this.processFeeds(this.feeds, this.options);
		this.tweets = await this.sortTweets();
		this.saveToCacheFile();
		this.startTimer(this.feeds, this.options);

		return this;
	}
}

objectAssign(Birdwatch.prototype, EventEmitter.prototype);
objectAssign(Birdwatch.prototype, require('./utils'));
objectAssign(Birdwatch.prototype, require('./report'));
