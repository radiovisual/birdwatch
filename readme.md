# Birdwatch :baby_chick::watch:

> Get raw tweets from one or more specific twitter feeds. 
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

var birdwatch = new Birdwatch()
    .feed('gulpjs')
    .feed('reactjs', {filterTags: /#reactjs/i})
    .feed('nodejs',  {filterTags: /#nodejs/i, removeRetweets:true})
    .start();

// Now get your tweets in JSON format to serve or print
birdwatch.getCachedTweets();

```

## Features

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

Type: `Number`<br>
Default: `600`

The number of seconds to wait before the cache updates again. The default is 10 minutes (600 seconds)
 
**Tip:** Update your cache frequently, but not frequently enough to hit any [Twitter API Rate Limits](https://dev.twitter.com/rest/public/rate-limits).
  
##### logReports

Type: `Boolean`<br>
Default: `false`

Shows a pretty-printed update to the console. Useful for debugging and logging.

# ![birdwatch](media/screenshot-v.1.0.0.png)

##### useTestData

Type: `boolean`<br>
Default: `false`

Use the test tweet data instead of making a network requests. Useful for testing/debugging.

##### sortBy

Type: `function`<br>

Override the custom sorting function. Birdwatch defaults sorting to chronological order.

### birdwatch.feed(screenname, options)

Add a twitter feed.

#### screenname

*Required*<br>
Type: `string`

The screenname of the twitter account you want to watch.

#### options

Type: `object`

Feed options.

##### filterTags
  
Type: `Regex`<br>
  
The regular expression containing the tags you want to filter with. If you do not supply a feed with a filter, then Birdwatch simply returns all tweets from that feed.
  
**Tip:** If you need help writing your regular expressions, try [regexpal.com](http://regexpal.com/)
   
##### removeRetweets
  
Type: `boolean`<br>
Default: `false`

Use this if you want to remove retweets from the feed you are watching.

### birdwatch.start()

Start the Birdwatch process.

### birdwatch.getCachedTweets()

Use this to access the birdwatch cache of tweets in the JSON format

Returns: `Array`

### Notes on Release 1.0

- Birdwatch is now in its `1.0` release, which means some subtle API changes have occurred:
  - `.start()` and `.getCachedTweets()` no longer return a Promise.
  - Custom sorting functions can now be passed to the Birdwatch instance. 
- Birdwatch saves the filtered and sorted tweets to the hard disk, so you can use the cache file anyway you want, **but Birdwatch only uses in-memory cache to serve data**. [Discussion here](https://github.com/radiovisual/birdwatch/issues/9).
- Internally, the entire codebase has adopted the ES6 syntax (transpiles with Babel).
- The unit testing framework has migrated from Mocha to AVA.  

### License

MIT @ [Michael Wuergler](http://numetriclabs.com/)

