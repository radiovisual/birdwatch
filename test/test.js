import path from 'path';
import fs from 'fs';

import osTmpdir from 'os-tmpdir';
import getPort from 'get-port';
import rm from 'rimraf';
import test from 'ava';
import got from 'got';
import pify from 'pify';

import Birdwatch from '../dist';
import testData from './test-tweets.json';

test.before('setup', () => {
	rm.sync(`${__dirname}/custom`);
});

test.after('cleanup', () => {
	rm.sync(`${__dirname}/custom`);
});

test('should expose a constructor', t => {
	t.is(typeof Birdwatch, 'function');
});

test('should add a feed with .feed()', t => {
	const birdwatch = new Birdwatch({server: false}).feed('testfeed');
	t.is(birdwatch._feed[0].screenname, 'testfeed');
});

test('should fail when a screenname is not supplied to .feed()', async t => {
	const birdwatch = new Birdwatch({server: false, testData}).feed('');
	await t.throws(birdwatch.start(), 'Screenname required');
});

test('should add a feed with options', t => {
	const birdwatch = new Birdwatch({server: false}).feed('testfeed', {filterTags: /test/i});
	t.true(birdwatch._feed[0].options.hasOwnProperty('filterTags'));
});

test('should fail if no feed is supplied', async t => {
	const birdwatch = new Birdwatch({server: false});
	await t.throws(birdwatch.start(), 'You must supply at least one feed to Birdwatch');
});

test('should get tweet data returned', async t => {
	await new Birdwatch({testData, server: true, port: 0})
		.feed('test', {})
		.start().then(tweets => {
			t.is(typeof tweets[0].text, 'string');
		});
});

test('should fail when filterTags is not a valid regex', async t => {
	const bw = await new Birdwatch({testData, server: false}).feed('test', {filterTags: 'a'});
	t.throws(bw.start(), 'Invalid regex: a for test');
});

test('should filter hashtags', async t => {
	await new Birdwatch({testData, server: false})
		.feed('test', {filterTags: /#01|#02|#03/})
		.start().then(tweets => {
			t.is(tweets.length, 3);
		});
});

test('should remove retweets with removeRetweets:true', async t => {
	await new Birdwatch({testData, server: false})
		.feed('test', {removeRetweets: true})
		.start().then(tweets => {
			t.is(tweets.length, 5);
		});
});

test('should allow multiple feeds with options', async t => {
	await new Birdwatch({testData, server: false})
		.feed('noretweets', {removeRetweets: true})
		.feed('specifichashtags', {filterTags: /#01|#02|#03/})
		.start().then(tweets => {
			t.is(tweets.length, 8);
		});
});

test('should sort the tweets', async t => {
	await new Birdwatch({testData, server: false})
		.feed('test')
		.start().then(tweets => {
			t.is(tweets.length, 10);
			t.is(tweets[9].created_at, 'Mon Jul 01 14:14:42 +0000 2015');
			t.is(tweets[0].created_at, 'Mon Jul 10 14:14:42 +0000 2015');
		});
});

test('should sort tweets from multiple feeds', async t => {
	await new Birdwatch({testData, server: false})
		.feed('test1', 	{filterTags: /#01|#02/})
		.feed('test2', 	{filterTags: /#01|#02/})
		.start().then(tweets => {
			t.is(tweets.length, 4);
			t.is(tweets[0].created_at, 'Mon Jul 02 14:14:42 +0000 2015');
			t.is(tweets[1].created_at, 'Mon Jul 02 14:14:42 +0000 2015');
		});
});

test('should allow custom sorting', async t => {
	const fn = function (x) {
		const n = parseInt(x.text.substring(12), 10);
		return n % 2 === 0 ? 1 : -1;
	};
	await new Birdwatch({testData, sortBy: fn, server: false})
		.feed('test1')
		.start().then(tweets => {
			t.is(tweets[0].text, 'test tweet #09');
			t.is(tweets[9].text, 'test tweet #02');
		});
});

test('should fail if custom sorting function is not a valid function', async t => {
	t.throws(() => {
		new Birdwatch({testData, sortBy: [], server: false}).feed('test1').start();
	}, TypeError, 'sortBy value must be a function.');
});

test('filterTags should accept an array of strings', async t => {
	await new Birdwatch({testData, server: false})
		.feed('test', {filterTags: ['01', '02']})
		.start()
		.then(tweets => {
			t.is(tweets.length, 2);
		});
});

test('should set a limit', async t => {
	await new Birdwatch({testData, server: false})
		.feed('test', {filterTags: ['01', '02', '03', '04'], limit: 2})
		.start().then(tweets => {
			t.is(tweets.length, 2);
		});
});

test('should set custom cache directory', async t => {
	const birdwatch = new Birdwatch({server: false, cacheDir: '/custom/location'}).feed('testfeed');
	t.is(birdwatch.options.cacheDir, '/custom/location');
});

test('should set custom url in options', async t => {
	const birdwatch = new Birdwatch({server: false, url: '/custom/url'}).feed('testfeed');
	t.is(birdwatch.options.url, '/custom/url');
});

test('should launch server', async t => {
	await getPort().then(async port => {
		await new Birdwatch({testData, port}).feed('testfeed').start();
		t.true((await got(`http://localhost:${port}/birdwatch/tweets`)).body.length > 0);
		t.true(JSON.parse((await got(`http://localhost:${port}/birdwatch/tweets`)).body)[0].hasOwnProperty('created_at'));
	});
});

test('custom url should be reachable', async t => {
	await getPort().then(async port => {
		await new Birdwatch({testData, port, url: '/custom/url'}).feed('testfeed').start();
		t.true((await got(`http://localhost:${port}/custom/url`)).body.length > 0);
		t.true(JSON.parse((await got(`http://localhost:${port}/custom/url`)).body)[0].hasOwnProperty('created_at'));
	});
});

test('should set refreshTime', async t => {
	const birdwatch = new Birdwatch({refreshTime: 300, server: false}).feed('testfeed');
	t.is(birdwatch.options.refreshTime, 300);
});

test('should set server option', async t => {
	const birdwatch = new Birdwatch({refreshTime: 300, server: false}).feed('testfeed');
	t.is(birdwatch.options.server, false);
});

test('saves to cache file', async t => {
	const tempdir = osTmpdir();
	const filepath = path.join(tempdir, 'cached_tweets.json');

	await new Birdwatch({cacheDir: tempdir, testData, server: false}).feed('testfeed', {removeRetweets: true}).start();

	pify(fs.readFile)(filepath, 'utf8').then(data => {
		const tweets = JSON.parse(data);
		t.is(tweets.length, 5);
	});
});
