const Birdwatch = require('./../dist/');
const testData = require('./testTweets.json');

const settings = {
	testData:testData,
	refreshTime:600,
	logReports: false,
	port: 0
};

 const bw = new Birdwatch(settings)
	 .feed('birdwatchnpm')
	 .feed('justinbieber')
	 .start()
	 .then(tweets => {
		console.log('\nbirdwatch is ready to serve %s tweets', tweets.length);
	});

