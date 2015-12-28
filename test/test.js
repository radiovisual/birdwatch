import configuration from '../configure/birdwatch-config.js';
import Birdwatch from '../dist';
import test from 'ava';


test('should expose a constructor', t => {
	t.is(typeof Birdwatch, 'function');
});

<<<<<<< HEAD
describe('Public API', function(){

    it('should add a feed with .feed()', function(){
        var birdwatch = new Birdwatch()
            .feed('testfeed');
        assert(birdwatch._feed[0].screenname === 'testfeed');
    });

    it('should fail when a screenname is not supplied to .feed()', function(){

        var birdwatch = new Birdwatch()
            .feed('', {});

        birdwatch.start(function(err){
                assert(err && error.message === "Screenname required");
        });

    });

    it('should add a feed with options', function(){

        var birdwatch = new Birdwatch()
           .feed('testfeed', { filterTags:/test/i });

        assert(birdwatch._feed[0].options.hasOwnProperty('filterTags'));
    });

    it('should fail if no feed is supplied', function(){

        var birdwatch = new Birdwatch();
        birdwatch.start(function(err){
            assert(err.message === "You must supply at least one feed to Birdwatch");
        });
    });

    it('should get fulfilled promise from .getCachedTweets()', function(){

        var birdwatch = new Birdwatch()
            .feed('MichaelWuergler');

		birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            assert(tweetdata.length > 0);
        });

    });

    it('should get tweet data returned from .getCachedTweets()', function(){

        var birdwatch = new Birdwatch()
            .feed('MichaelWuergler');

		birdwatch.start(function(err){

		});

		return birdwatch.getCachedTweets().then(function(tweetdata){
			console.log('tweetdata created_at: ', tweetdata[0].created_at);
			assert(tweetdata[0].created_at);
		});

    });

    it('should fail when filterTags is not a valid regex', function(){

        var birdwatch = new Birdwatch()
            .feed('Twitterer', {filterTags: ''});

        birdwatch.start(function(err){
            assertEqual(err.message.slice(0,38) , "You must supply a regex to filterTags");
        });

    });

    /*
     // Currently, we can't test filterTags
     // below test fails on iojs and node 0.12
     // See: https://github.com/radiovisual/birdwatch/issues/4
    it('should return only filtered tweets with option `filterTags`', function(){

        var birdwatch = new Birdwatch({useTestData:true})
            .feed('MichaelWuergler', {filterTags: /#09|#08|#07|#06/});

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            assert(tweetdata.length === 4);
        });
=======
test('should add a feed with .feed()', t => {
	const birdwatch = new Birdwatch().feed('testfeed');
	t.is(birdwatch._feed[0].screenname, 'testfeed');
});
>>>>>>> es6

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
