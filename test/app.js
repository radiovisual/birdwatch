const Birdwatch = require('./../dist/');
// const testData = require('./testTweets.json');

const settings = {
	testData: false,
	refreshTime: 600,
	port: 0
};

new Birdwatch(settings)
	.feed('taylorswift13')
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

