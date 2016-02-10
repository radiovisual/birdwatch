'use strict';
const chalk = require('chalk');
const version = require('./../package').version;

module.exports.logStartMessage = function (refreshTime, birdwatch) {
	console.log(birdwatch);
	const feeds = birdwatch.feeds.length;
	const refreshSeconds = birdwatch.options.refreshTime;
	const refreshMinutes = Math.round(refreshSeconds / 60);
	const cache = `${birdwatch.options.cacheDir}/cached_tweets.json`;
	const server = birdwatch.options.server;
	const port = birdwatch.options.port;
	const url = birdwatch.options.url;
	const vers = `v${version}`;

	console.log('\n\n');
	console.log(chalk.cyan('| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ '));
	console.log(`${chalk.cyan('|')}  Running Birdwatch ${chalk.gray(vers)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Monitoring Feeds: ')} ${chalk.white(feeds)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Refresh Time: ')} ${chalk.white(refreshSeconds)} secs (${refreshMinutes} min)`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Cache File: ')} ${chalk.white(cache)}`);

	if (server) {
		console.log(`${chalk.cyan('|')} ${chalk.gray(' Birdwatch Server: ')} localhost:${chalk.cyan(port)}${url}`);
	}
	console.log(chalk.cyan('| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ '));
};

module.exports.logError = function (message, exit) {
	if (message.join) {
		message = message.join('\n');
	}
	console.log(chalk.red('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
	console.log(chalk.red('ERROR!'));
	console.log(chalk.white(message));
	console.log(chalk.red('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'));

	if (exit === true) {
		process.exit(1);
	}
};

module.exports.reportSuccessMessageWithTime = function (message) {
	console.log(chalk.cyan('\nSUCCESS: ') + message);
	console.log(chalk.gray(new Date()));
	console.log();
};

module.exports.processBirdwatchingMessage = function () {
	console.log(`${chalk.cyan('\nLet\'s go Birdwatching!')} ${chalk.gray(new Date())}`);
	console.log();
};

module.exports.reportFetchingMessage = function (screenname, filterTags) {
	const name = chalk.white('Fetching twitter data for: ') + chalk.yellow(`@${screenname}`);
	const tags = filterTags ? chalk.gray(`(${filterTags})`) : '';
	console.log(`${name} ${tags}`);
};
