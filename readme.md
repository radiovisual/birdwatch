# Birdwatch :baby_chick::watch:

> Get and cache raw tweets from one or more specific twitter feeds. 
> *Optionally filter the tweets by hashtag!*

[![Build Status](https://travis-ci.org/radiovisual/birdwatch.svg?branch=master)](https://travis-ci.org/radiovisual/birdwatch)

Birdwatch will help you grab tweets from specific twitter accounts, and cache the tweets on your server, 
thus avoiding any request limits set by the Twitter API, and giving you more control over the data that is saved.
**You can filter tweets by hashtags, or ignore retweets!** 

**Note:** This is a work in progress. *Pull requests welcome!* 

## Installation

**Step 1:** Install the package via npm
```
$ npm install --save birdwatch
```

**Step 2:** Add your twitter app credentials to the configuration file
  1. Open the file `node_modules/birdwatch/birdwatch-config.js`
  2. Update the file with your Twitter App credentials.
  3. Rename the file to `local-config.js`
  4. *Now you're ready to birdwatch!*

## Usage

```js
var Birdwatch = require('birdwatch');

const settings = { logReports: true };

const bw = new Birdwatch(settings)
	.feed('test01')
	.feed('test02', {filterTags:['tagone', 'tagtwo']})
	.start()
	.then(function(tweets){
		console.log('birdwatch is ready to serve tweets');
	});
```

## Extra Features

### Cached HTML Tweet
 - If birdwatch can't find an `html` string on the returned tweet data, then it adds one for you using [tweet-patch](https://github.com/radiovisual/tweet-patch). 
   This means the plain-text hashtags, user-mentions and hyperlinks are converted to twitter-ready HTML. Example below.
   
 - ```js
   cached_tweets[0].text;
   //=> "This is the #plaintext tweet"
   
   cached_tweets[0].html;
   //=> "This is the <a href="https://twitter.com/hashtag/plaintext">#plaintext</a> tweet"
   ```
   
## API

### Birdwatch([options])

#### options

Type: `object`  

Options set here will override the defaults in the constructor.

##### refreshTime

Type: `Number`  
Default: `600`  

The number of seconds to wait before the cache updates again. The default is 10 minutes (600 seconds)
 
**Tip:** Update your cache frequently, but not frequently enough to hit any [Twitter API Rate Limits](https://dev.twitter.com/rest/public/rate-limits).
  
##### logReports

Type: `Boolean`  
Default: `false`  

Pretty print Bridwatch activity to the console. 

# ![birdwatch](media/screenshot-v.1.0.0.png)

##### url

Type: `string`  
Default: `/birdwatch/tweets`

The url you want to use to access the cached tweets. Requires the server to be running.

##### server

Type: `boolean`  
Default: `true`  

Boolean to turn the server off or on. Turn the server off if you want to run your own server. Your own server can do whatever it wants with the cache file in `birdwatch/dist/cache/`

##### cacheFile

Type: `string`  
Default: `${__dirname}/cache/cached_tweets.json`  

Override the location and filename of the cache file. Make sure you have appropriate read/write permissions on your new directory.

##### testData

Type: `json`  

Serve tweet data in JSON format to birdwatch. Useful for testing/debugging without making network requests.

##### sortBy

Type: `function`  
Default: *(chronological order)*  

Override the custom sorting function. Birdwatch defaults sorting to chronological order.

### birdwatch.feed(screenname, [options])

Add a twitter feed.

#### screenname

*Required*  
Type: `string`  

The screenname of the twitter account you want to watch.

#### options

Type: `object`  

Feed options.

##### filterTags
  
Type: `Regex|Array`  
  
The regular expression containing the tags you want to filter with, or an array of strings. For example, all of these examples will result in the same filter:

```js
.feed('user1', {filterTags: /#01|#02/gi })
.feed('user2', {filterTags: ['01','02'] })
.feed('user3', {filterTags: ['#01','#02'] })
```
  
**Tip:** If you need help writing your regular expressions, try [regexpal.com](http://regexpal.com/)
   
##### removeRetweets
  
Type: `boolean`  
Default: `false`  

Use this if you want to remove retweets from the feed you are watching.

### birdwatch.start()

Start the Birdwatch process.

### License

MIT @ [Michael Wuergler](http://numetriclabs.com/)

