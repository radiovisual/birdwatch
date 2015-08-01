'use strict';

var chalk = require('chalk');
var version = require('./package').version;

module.exports.logStartMessage = function (options, feeds){
    console.log();
    console.log(chalk.cyan("| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |"));
    console.log(chalk.cyan("|")+" Running Birdwatch "+chalk.gray(version));
    console.log(chalk.cyan("|")+chalk.gray(" Monitoring Feeds: ")+chalk.white(feeds.length) );
    console.log(chalk.cyan("|")+chalk.gray(" Refresh Time: ")+chalk.white(options.refreshTime+" secs ("+secondsToMinutes(options.refreshTime)+" mins)") );
    console.log(chalk.cyan("| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |\n"));
};

module.exports.reportConfigFileMissingError = function(){
    console.log(chalk.red('\n\n| CONFIGURATION ERROR!'));
    console.error(chalk.white("| Config file "+chalk.yellow("configure/local_configure.js")+" missing!"));
    console.error("| Did you forget to create your local_configure.js file?\n\n");
    process.exit(1);
};

module.exports.checkCredentialsForDefaultValues = function(credentials){
    if (
        credentials.consumer_key === 'YOUR_CONSUMER_KEY' ||
        credentials.consumer_secret === 'YOUR_CONSUMER_SECRET' ||
        credentials.access_token ===  'YOUR_ACCESS_TOKEN' ||
        credentials.access_token_secret === 'YOUR_ACCESS_TOKEN_SECRET'
    ) {
        this.logError(chalk.white("Please update your ") + chalk.yellow("configure/local_configure.js")+ chalk.white(" file with your credentials.\n\n"), true);
    }
};

module.exports.logError = function(message, exit){

    if(message.join){
        message = message.join("\n");
    }
    console.log(chalk.red('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
    console.log(chalk.red('ERROR!'));
    console.error(chalk.white(message));
    console.log(chalk.red('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'));

    if (exit === true) {
        process.exit(1);
    }
};

module.exports.reportSuccessMessageWithTime = function(message){
    console.log( chalk.cyan("\nSUCCESS: ")+message);
    console.log( chalk.gray(new Date() ));
    console.log();
};

function secondsToMinutes(seconds){
    return Math.round(seconds/60);
}
