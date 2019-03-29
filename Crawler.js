const puppeteer = require('puppeteer');

function generateCrawlerId() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return s4() + s4() + '-' + s4();
}

class Crawler {

    constructor(paramsCrawlers, queue, logger) {
        this.queue = queue;
        this.logger = logger;
        this.numTasksProcessed = 0;
        this.numTasksSuccess = 0;
        this.numTasksError = 0;

        if (typeof paramsCrawlers.numPages === 'undefined') {
            this.numPages = 1;
        } else {
            this.numPages = paramsCrawlers.numPages;
        }

        if (typeof paramsCrawlers.killCrawler !== 'undefined') {
            this.killCrawler = paramsCrawlers.killCrawler;
        }

        if (typeof paramsCrawlers.userAgent !== 'undefined') {
            this.userAgent = paramsCrawlers.userAgent;
        }

        if (typeof paramsCrawlers.taskTimeout === 'undefined') {
            this.taskTimeout = 35000;
        } else {
            this.taskTimeout = paramsCrawlers.taskTimeout;
        }

        if (typeof paramsCrawlers.verbose === 'undefined') {
            this.verbose = 0;
        } else {
            this.verbose = paramsCrawlers.verbose;
        }

        if (typeof paramsCrawlers.argsBrowser === 'undefined') {
            this.argsBrowser = []
        } else {
            this.argsBrowser = paramsCrawlers.argsBrowser;
        }

        this.crawlerID = generateCrawlerId();
    }

    async init() {
        this.browser = await puppeteer.launch({
            args: this.argsBrowser,
        });
    }

    async close() {
        return this.browser.close();
    }

    async crawlChunk() {
        const safetyPromise = new Promise((resolve) => {
            this.browser.on('disconnected', async () => {
                resolve();
            });
        });

        let cpt = 0;
        const pagesPromises = [];
        for (let i = 0; i < this.numPages; i++) {
            pagesPromises.push(new Promise(async (resolve) => {
                let task = this.queue.getTask();
                try {
                    while (typeof task !== 'undefined') {
                        // TODO add a timeout for the task in addition to the timeout to load the page
                        this.logger.info(`(crawler ${this.crawlerID}): Number of tasks: ${this.queue.numTasksDone}/${this.queue.numTotalTasks}`);
                        const page = await this.browser.newPage();

                        if (typeof this.userAgent !== 'undefined') {
                            await page.setUserAgent(this.userAgent);
                        }

                        try {
                            await task.action(page, task.url);
                            this.logger.info(`(crawler ${this.crawlerID}): Task on url ${task.url} succeeded`);
                            this.numTasksSuccess++
                        } catch (err) {
                            this.logger.error(`(crawler ${this.crawlerID}): Task on url ${task.url} failed`);
                            this.logger.error(err.message);
                            this.numTasksError++;
                        } finally {
                            this.numTasksProcessed++
                        }

                        try {
                            await page.close();
                        } catch (err) {
                            this.logger.error(`(crawler ${this.crawlerID}): Failed to close page`);
                        }

                        if (typeof this.killCrawler !== 'undefined' && cpt >= this.killCrawler) break;

                        task = this.queue.getTask();
                        cpt++;
                    }
                } catch (e) {
                    this.logger.error(`(crawler ${this.crawlerID}): An unexpected error happened`);
                    this.logger.error(e.toString());
                } finally {
                    resolve();
                }
            }));
        }

        await Promise.race([
            Promise.all(pagesPromises),
            safetyPromise
        ]);

        try {
            await this.close()
        } catch (err) {
            this.logger.error(`Error when closing the browser: ${err.toString()}`);
        }
    }

    async launch() {
        while (this.queue.tasks.length > 0) {
            // TODO maybe bug here
            this.logger.info(`(crawler ${this.crawlerID}): before crawl chunk`);
            await this.crawlChunk();
            this.numTasksProcessed = 0;
            this.numTasksSuccess = 0;
            this.numTasksError = 0;
            this.logger.info(`(crawler ${this.crawlerID}): before after chunk`);
        }
    }

}

module.exports = Crawler;
