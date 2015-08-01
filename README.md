# Birdwatch 

:baby_chick: :watch:

**Get raw tweets from one or more specific twitter feeds.**

Birdwatch will help you grab tweets from specific twitter accounts, and cache the tweets in a local file on your server,
thus avoiding any request limits set by the Twitter API, and giving you more control over the data that is saved.
You can filter tweets by hashtags, or ignore retweets.  

# ![birdwatch](media/screenshot-v.0.0.1.png)

**Note:** This is a work in progress. *Pull requests welcome!*

### Features

- Simple API
- Easily configure how often you want the cache to update
- Filter the tweets by hashtags
- Easy setup

### Usage

```js

var Birdwatch = require('./index');

var birdwatch = new Birdwatch({refreshTime: 600, port:4002})
    .feed('reactjs', {filter_tags: /#reactjs/i })
    .feed('nodejs', { filter_tags: /#nodejs/i });

birdwatch.start(function (err) {
    if(!err) {
        // done
    }
});

// now get your tweets in JSON format
console.log(birdwatch.getCachedTweets());

```

### TODO:

- [ ] Better serving solution
- [ ] Write tests
- [ ] Write documentation
- [ ] publish to npm
- [ ] Allow custom sorting rules
- [ ] HTML-ify the cached tweets
- [ ] More caching options (currently on-disk/in-memory only)

### License

The MIT License (MIT)

Copyright (c) 2015 Michael Wuergler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
