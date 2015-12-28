'use strict';

const chalk = require('chalk');
const version = require('./../package').version;

module.exports.logStartMessage = function (refreshTime, feedNum) {
	console.log('\n\n');
	console.log(chalk.cyan('| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |'));
	console.log(`${chalk.cyan('|')}  Running Birdwatch ${chalk.gray(version)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Monitoring Feeds: ')} ${chalk.white(feedNum)}`);
	console.log(`${chalk.cyan('|')} ${chalk.gray(' Refresh Time: ')} ${chalk.white(refreshTime)} secs (${secondsToMinutes(refreshTime)} mins)`);
	console.log(chalk.cyan('| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |\n'));
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

function secondsToMinutes(seconds) {
	return Math.round(seconds / 60);
}

module.exports.processBirdwatchingMessage = function () {
	console.log(`${chalk.cyan('\nLet\'s go Birdwatching!')} ${chalk.gray(new Date())}`);
	console.log();
};

module.exports.reportFetchingMessage = function (screenname, filterTags) {
	const name = chalk.white('Fetching twitter data for: ') + chalk.yellow(`@${screenname}`);
	const tags = filterTags ? chalk.gray(`(${filterTags})`) : '';
	console.log(`${name} ${tags}`);
};
