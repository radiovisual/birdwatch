const Birdwatch = require('./../dist/');
const testData = require('./testTweets.json');

const settings = {
	testData:testData,
	logReports: true,
	refreshTime:250
};

 //const bw = new Birdwatch(settings)
	//.feed('test01')
	//.feed('test02', {filterTags:/#1|#2/})
	//.start()
	//.then(function(tweets){
	//	console.log('birdwatch is ready to serve tweets');
	//});

var birdwatch = new Birdwatch({logReports: true, refreshTime:20})
	.feed('Refugees')
	.feed('UNDP')
	.feed('UNOCHA')
	.feed('NRC_Norway')
	.feed('DRC_uk')
	.feed('OCHA_Syria')
	.feed('UNDP_Africa')
	.feed('BBCWorld', {filterTags: ['humanitarian', 'UN', 'UnitedNations']})
	.start();


