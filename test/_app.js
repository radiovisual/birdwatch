'use strict';
const Birdwatch = require('./../dist/');
const testData = require('./testTweets.json');

const settings = {
	testData:testData,
	logReports:true,
	refreshTime:60
};

const bw = new Birdwatch(settings)
	.feed('test01')
	.feed('test02', {filterTags:/#1|#2/})
	.start();
