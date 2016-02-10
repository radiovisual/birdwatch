const Birdwatch = require('./../dist/');
const testData = require('./testTweets.json');

const settings = {
	testData:testData,
	refreshTime:600,
	port: 0
};

 const bw = new Birdwatch(settings)
	 .feed('birdwatchnpm')
	 .feed('justinbieber', {filterTags: ['believe']})
	 .feed('taylorswift13')
	 .start()
	 .then(tweets => {
		console.log('\nbirdwatch is ready to serve %s tweets', tweets.length);
	});


