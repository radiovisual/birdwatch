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
	const bw = new Birdwatch()
		.feed('MichaelWuergler', {})
		.start().then(() => {
			t.is(typeof bw.getCachedTweets()[0].text, 'string');
		});
});

test('should fail when filterTags is not a valid regex', async t => {
	const bw = await new Birdwatch()
		.feed('MichaelWuergler', {filterTags: 'a'});

	t.throws(bw.start(), 'Invalid regex: a for MichaelWuergler');
});

test('should not expose private keys in configure/birdwatch-config.js', t => {
	t.true(
		configuration.consumer_key          === 'YOUR_CONSUMER_KEY' &&
		configuration.consumer_secret       === 'YOUR_CONSUMER_SECRET' &&
		configuration.access_token          === 'YOUR_ACCESS_TOKEN' &&
		configuration.access_token_secret   === 'YOUR_ACCESS_TOKEN_SECRET'
	);
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

    });
    */

    /*
    // Currently, we can't test removeRetweets
    // See: https://github.com/radiovisual/birdwatch/issues/4
    it('should remove retweets with option `removeRetweets`', function(){

        var birdwatch = new Birdwatch({useTestData:true})
            .feed('Twitterer', {removeRetweets:true} );

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            console.log("tweetdata.length ",tweetdata.length);
            console.log("tweetdata ",tweetdata);
            assert(tweetdata.length === 5);
        });

    });
    */

    /*
    // Currently, we can't test sorting
    // See: https://github.com/radiovisual/birdwatch/issues/4
    it('should sort the tweets', function(){

    });
    */



