'use strict';
var configuration = require('../configure/configure.js');
var Birdwatch = require('../');
var chai = require("chai");
var assert = chai.assert;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);


describe('Birdwatch', function() {

    it('should expose a constructor', function () {
        assert.equal(typeof(Birdwatch), "function");
    });

    it('should return an instance if called without `new`', function(){
        var birdwatch = Birdwatch;
        assert(birdwatch() instanceof Birdwatch);
    });

});

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

        var birdwatch = new Birdwatch({useTestData:true})
            .feed('MichaelWuergler');

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            assert(tweetdata);
        });

    });

    it('should get tweet data returned from .getCachedTweets()', function(){

        var birdwatch = new Birdwatch({useTestData:true})
            .feed('MichaelWuergler');

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            assert(tweetdata[0].created_at);
        });

    });

    it('should fail when filter_tweets is not a valid regex', function(){

        var birdwatch = new Birdwatch()
            .feed('Twitterer', {filterTags: ''});

        birdwatch.start(function(err){
            assertEqual(err.message.slice(0,38) , "You must supply a regex to filterTags");
        });

    });

    /*
    // Currently, we can't test filterTags
    // See: https://github.com/radiovisual/birdwatch/issues/4
    it('should return only filtered tweets with option `filterTags`', function(){

        var birdwatch = new Birdwatch({useTestData:true})
            .feed('MichaelWuergler', {filterTags: /#09/});

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            console.log("tweetdata ", tweetdata);
            assert(tweetdata[0].text.search("#09") > -1);
        });

    });
    */

    /*
    // Currently, we can't test remove_retweets
    // See: https://github.com/radiovisual/birdwatch/issues/4
    it('should remove retweets with option `remove_retweets`', function(){

        var birdwatch = new Birdwatch({useTestData:true})
            .feed('Twitterer', {remove_retweets:true} );

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
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

});

describe('Configuration', function(){

    it("should not expose private keys in configure/configure.js", function(){

        assert(
            configuration.consumer_key          === 'YOUR_CONSUMER_KEY' &&
            configuration.consumer_secret       === 'YOUR_CONSUMER_SECRET' &&
            configuration.access_token          === 'YOUR_ACCESS_TOKEN' &&
            configuration.access_token_secret   === 'YOUR_ACCESS_TOKEN_SECRET'
        );
    });

});



