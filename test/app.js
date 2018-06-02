/* eslint-disable import/no-unresolved */
const Birdwatch = require('./../dist');

const settings = {
	testData: false,
	refreshTime: 35,
	port: 8417
};

new Birdwatch(settings)
	.feed('taylorswift13')
	.feedsFromList('birdwatch-allstars', 'birdwatchnpm')
	.feedsFromList('unhcr-twitter-stars', 'GisellaLomax')
	.start()
	.then(tweets => {
		console.log('\nbirdwatch is ready to serve %s tweets', tweets.length);
		tweets.forEach(tweet => {
			console.log('text', tweet.text);
			console.log('html', tweet.html);
			console.log('\n\n');
		});
	}).catch(err => {
		console.log(err);
	});
