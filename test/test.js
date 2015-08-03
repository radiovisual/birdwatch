'use strict';
var configuration = require('../configure/configure.js');
var Birdwatch = require('../');
var chai = require("chai");
var assert = chai.assert;
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

/*
 * TODO: Add more tests
 *
 * removes filtered tweets
 * removes retweets when remove_retweets:true
 * fails if filter_tags isn't valid regex
 * tweets are sorted
 *
 * */

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
           .feed('testfeed', { filter_tags:/test/i });

        assert(birdwatch._feed[0].options.hasOwnProperty('filter_tags'));
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
            assert(tweetdata);
        });

    });

    it('should get tweet data returned from .getCachedTweets()', function(){

        var birdwatch = new Birdwatch()
            .feed('MichaelWuergler');

        birdwatch.start(function(err){});

        return birdwatch.getCachedTweets().then(function(tweetdata){
            assert(tweetdata[0].created_at);
        });

    });

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



