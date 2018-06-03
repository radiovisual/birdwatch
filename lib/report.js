const chalk = require('chalk');
const {version} = require('./../package');

module.exports.logStartMessage = function (refreshTime, birdwatch) {
	const {server, port, url} = birdwatch.options;
	const feeds = birdwatch.feed() ? birdwatch.feed().length : 0;
	const feedsFromLists = birdwatch.feedsFromList() ? birdwatch.feedsFromList().length : 0;
	const refreshSeconds = birdwatch.options.refreshTime;
	const refreshMinutes = Math.round(refreshSeconds / 60);
	const cache = `${birdwatch.options.cacheDir}/cached_tweets.json`;
	const vers = `v${version}`;

	console.log('\n\n');
	console.log(chalk.cyan('|  '));
	console.log(`${chalk.cyan('|')}  Running Birdwatch ${chalk.gray(vers)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Monitoring Feeds: ')} ${chalk.white(feeds)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Monitoring Twitter Lists: ')} ${chalk.white(feedsFromLists)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Refresh Time: ')} ${chalk.white(refreshSeconds)} secs (${refreshMinutes} min)`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Cache File: ')} ${chalk.white(cache)}`);

	if (server) {
		console.log(`${chalk.cyan('|')} ${chalk.gray(' Birdwatch Server: ')} localhost:${chalk.cyan(port)}${url}`);
	}
	console.log(chalk.cyan('|  '));
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
