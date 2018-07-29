/* eslint-disable import/no-unresolved */
const Birdwatch = require('./../dist');

const settings = {
	testData: false,
	refreshTime: 35,
	port: 8417,
	balancedScreennames: true
};

new Birdwatch(settings)
	.feedsFromList('unhcr-twitter-stars', 'GisellaLomax')
	.start()
	.then(tweets => {
		console.log('\nbirdwatch is ready to serve %s tweets', tweets.length);
		// tweets.forEach(tweet => {
		// 	console.log('text', tweet.text);
		// 	console.log('html', tweet.html);
		// 	console.log('\n\n');
		// });
		// console.log(tweets);
		tweets.forEach(t =>
			console.log(`${t.user.screen_name} ${t.birdwatchUniqueUserPlacement}`)
		);
	})
	.catch(err => {
		console.log(err);
	});
