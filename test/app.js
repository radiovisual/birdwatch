const Birdwatch = require('./../dist/');
// const testData = require('./testTweets.json');

const settings = {
	testData: false,
	refreshTime: 600,
	port: 0
};

new Birdwatch(settings)
	.feed('birdwatchnpmTHISSHOULDNOTEXISTSATALLEVER')
	.feed('justinbieber', {filterTags: ['believe']})
	.feed('taylorswift13')
	.start()
	.then(tweets => {
		console.log('\nbirdwatch is ready to serve %s tweets', tweets.length);
	}).catch(err => {
		console.log(err);
	});

