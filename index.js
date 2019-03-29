'use strict';

process.setMaxListeners(0);

const CrawlerPool = require('./CrawlerPool');
const winston = require('winston');
const fs = require('fs');
const {numWebsites, numPages, numBrowsers} = require("./config");


const logger = winston.createLogger({level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

function readURLs(path, numURLs) {
  return fs.readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(row => `http://${row.split(',')[1]}`)
    .slice(0, numURLs);
}

async function myTask(page, url) {
  await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US'
  });

  await page.goto(url, {
    timeout: 15000
  });

  const res = await page.evaluate(() => {
    return window.location.href;
  });

  console.log(`Visited ${res}`);
}

(async() => {
  const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3239.108 Safari/537.36';

  const paramsCrawlers = {
      numPages: numPages,
      userAgent: USER_AGENT,
      taskTimeout: 20000,
      verbose: 1,
      argsBrowser: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      killCrawler: 300, // kill crawlers every X tasks
  };

  const paramsPool = {
    delaySpawn: 500,
  };

  const crawlerPool = new CrawlerPool(numBrowsers, paramsPool, paramsCrawlers, logger);
  const urls = readURLs('./alexa.csv', numWebsites);

  urls.forEach((url) => {
    crawlerPool.addTask({
      url: url,
      action: myTask
    })
  });

  await crawlerPool.launch();
  await crawlerPool.close();
})();


// Launch a pool of crawlers
// We can specify the number of crawlers
// For each crawler, we also want to specify the maximum number of pages
// Delay between two crawlers spawned
// We can pass a user agent parameter that will be applied to all crawlers -> useful for crawling
// We can specify a timeout to load a page + a timeout for a task
// Add option to automatically add header language + remove webdriver


// TODO kill all pages/browsers when closed
