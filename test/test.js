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
	const bw = await new Birdwatch().feed('MichaelWuergler', {}).start();
	t.is(typeof bw.getCachedTweets()[0].text, 'string');
});

test('should fail when filterTags is not a valid regex', async t => {
	const bw = await new Birdwatch().feed('MichaelWuergler', {filterTags: 'a'});
	t.throws(bw.start(), 'Invalid regex: a for MichaelWuergler');
});

test('should filter hashtags', async t => {
	const bw = await new Birdwatch({useTestData:true}).feed('test', {filterTags: /#01|#02|#03/}).start();
	t.is(bw.getCachedTweets().length, 3);
});

test('should remove retweets with removeRetweets:true', async t => {
	const bw = await new Birdwatch({useTestData:true}).feed('test', {removeRetweets:true}).start();
	t.is(bw.getCachedTweets().length, 5);
});

test('should sort the tweets', async t => {
	const bw = await new Birdwatch({useTestData:true}).feed('test').start();
	t.is(bw.getCachedTweets().length, 10);
	t.is(bw.getCachedTweets()[9].created_at, 'Mon Jul 01 14:14:42 +0000 2015');
	t.is(bw.getCachedTweets()[0].created_at, 'Mon Jul 10 14:14:42 +0000 2015');
});

test('should not expose private keys in configure/birdwatch-config.js', t => {
	t.true(
		configuration.consumer_key          === 'YOUR_CONSUMER_KEY' &&
		configuration.consumer_secret       === 'YOUR_CONSUMER_SECRET' &&
		configuration.access_token          === 'YOUR_ACCESS_TOKEN' &&
		configuration.access_token_secret   === 'YOUR_ACCESS_TOKEN_SECRET'
	);
});



