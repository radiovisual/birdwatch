'use strict';

var chalk = require('chalk');
var version = require('./../package').version;

module.exports.logStartMessage = function (options, feeds){
    console.log();
    console.log(chalk.cyan("| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |"));
    console.log(chalk.cyan("|")+" Running Birdwatch "+chalk.gray(version));
    console.log(chalk.cyan("|")+chalk.gray(" Monitoring Feeds: ")+chalk.white(feeds.length) );
    console.log(chalk.cyan("|")+chalk.gray(" Refresh Time: ")+chalk.white(options.refreshTime+" secs ("+secondsToMinutes(options.refreshTime)+" mins)") );
    console.log(chalk.cyan("| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |\n"));
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

module.exports.processBirdwatchingMessage = function(){
    console.log( chalk.cyan("\nLet's go Birdwatching! ")+chalk.gray(new Date() )) ;
    console.log();
};

module.exports.reportFilteringMessage = function(screenname, filterTags){
    console.log(chalk.white.bold("Filtering tags: "+screenname+": ") + chalk.gray(filterTags));
};
