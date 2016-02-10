const Birdwatch = require('./../dist/');
const testData = require('./testTweets.json');

const settings = {
	testData:testData,
	refreshTime:20,
	port: 0
};

 const bw = new Birdwatch(settings)
	 .feed('birdwatchnpm')
	 .feed('justinbieber')
	 .start()
	 .then(tweets => {
		console.log('birdwatch is ready to serve tweets: ', tweets.length);
	});

