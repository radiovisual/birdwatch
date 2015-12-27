import configuration from '../configure/birdwatch-config.js';
import Birdwatch from '../dist';
import test from 'ava';


test('should expose a constructor', t => {
	t.is(typeof Birdwatch, 'function');
});

test('should add a feed with .feed()', t => {
	const birdwatch = new Birdwatch().feed('testfeed');
	t.is(birdwatch._feed[0].screenname, 'testfeed');
});

test('should fail when a screenname is not supplied to .feed()', async t => {
	const birdwatch = new Birdwatch().feed('');
	await t.throws(birdwatch.start(), 'Screenname required');
});

test('should add a feed with options', t => {
	const birdwatch = new Birdwatch().feed('testfeed', { filterTags:/test/i });
	t.true(birdwatch._feed[0].options.hasOwnProperty('filterTags'));
});

test('should fail if no feed is supplied', async t => {
	const birdwatch = new Birdwatch();
	await t.throws(birdwatch.start(), "You must supply at least one feed to Birdwatch");
});

test('should get tweet data returned from Birdwatch.getCachedTweets()', async t => {
	const bw = await new Birdwatch().feed('birdwatchnpm', {}).start();
	t.is(typeof bw.getCachedTweets()[0].text, 'string');
});

test('should fail when filterTags is not a valid regex', async t => {
	const bw = await new Birdwatch().feed('birdwatchnpm', {filterTags: 'a'});
	t.throws(bw.start(), 'Invalid regex: a for birdwatchnpm');
});

test('should filter hashtags', async t => {
	const bw = await new Birdwatch({useTestData:true}).feed('test', {filterTags: /#01|#02|#03/}).start();
	t.is(bw.getCachedTweets().length, 3);
});

test('should remove retweets with removeRetweets:true', async t => {
	const bw = await new Birdwatch({useTestData:true}).feed('test', {removeRetweets:true}).start();
	t.is(bw.getCachedTweets().length, 5);
});

test('should allow multiple feeds with options', async t => {
	const bw = await new Birdwatch({useTestData:true})
		.feed('noretweets', {removeRetweets:true})
		.feed('specifichashtags', {filterTags: /#01|#02|#03/})
		.start();
	t.is(bw.getCachedTweets().length, 8);
});

test('should sort the tweets', async t => {
	const bw = await new Birdwatch({useTestData:true}).feed('test').start();
	t.is(bw.getCachedTweets().length, 10);
	t.is(bw.getCachedTweets()[9].created_at, 'Mon Jul 01 14:14:42 +0000 2015');
	t.is(bw.getCachedTweets()[0].created_at, 'Mon Jul 10 14:14:42 +0000 2015');
});

test('should sort tweets from multiple feeds', async t => {
	const bw = await new Birdwatch({useTestData:true})
		.feed('test1', 	{filterTags: /#01|#02/})
		.feed('test2', 	{filterTags: /#01|#02/})
		.start();

	t.is(bw.getCachedTweets().length, 4);
	t.is(bw.getCachedTweets()[0].created_at, 'Mon Jul 02 14:14:42 +0000 2015');
	t.is(bw.getCachedTweets()[1].created_at, 'Mon Jul 02 14:14:42 +0000 2015');
});

test('should allow custom sorting', async t => {
	const fn = function(x,y) { var n = parseInt(x.text.substring(12)); if (n % 2 === 0) { return 1; } return -1 };
	const bw = await new Birdwatch({useTestData:true, sortBy:fn }).feed('test1').start();

	t.is(bw.getCachedTweets()[0].text, 'test tweet #09');
	t.is(bw.getCachedTweets()[9].text, 'test tweet #02');
});

test('should fail if custom sorting function is not a valid function', async t => {
	const bw = await new Birdwatch({useTestData:true, sortBy:[] }).feed('test1');
	t.throws(bw.start(), "sortBy value must be a function.");
});

test('should not expose private keys in configure/birdwatch-config.js', t => {
	t.true(
		configuration.consumerKey         === 'YOUR_CONSUMER_KEY' &&
		configuration.consumerSecret      === 'YOUR_CONSUMER_SECRET' &&
		configuration.accessToken         === 'YOUR_ACCESS_TOKEN' &&
		configuration.accessTokenSecret   === 'YOUR_ACCESS_TOKEN_SECRET'
	);
});
