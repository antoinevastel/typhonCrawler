const Crawler = require('./Crawler');
const Queue = require('./Queue');

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms)
    })
}

class CrawlerPool {
    constructor(numCrawlers, paramsPool, paramsCrawlers, logger) {
        this.numCrawlers = numCrawlers;
        this.paramsCrawlers = paramsCrawlers;
        this.logger = logger;

        if (typeof paramsPool.delaySpawn === 'undefined') {
            this.delaySpawnCrawler = 0;
        } else {
            this.delaySpawnCrawler = paramsPool.delaySpawn;
        }

        this.queue = new Queue();
        this.crawlers = [];
    }

    async launch() {
        for (let i = 0; i < this.numCrawlers; i++) {
            const crawler = new Crawler(this.paramsCrawlers, this.queue, this.logger);
            await crawler.init();
            this.logger.info(`Created crawler ${i + 1}`);
            this.crawlers.push(crawler);
            await sleep(this.delaySpawnCrawler);
        }

        const allPromises = [];
        for (let crawler of this.crawlers) {
            allPromises.push(crawler.launch());
        }

        const stats = setInterval(() => {
            for (let crawler of this.crawlers) {
                this.logger.info(`(crawler ${crawler.crawlerID}):`);
                this.logger.info(`Number total tasks: ${crawler.numTasksProcessed}`);
                this.logger.info(`Number total tasks success: ${crawler.numTasksSuccess}`);
                this.logger.info(`Number total tasks failed: ${crawler.numTasksError}`);
                this.logger.info(`---------------`);

                allPromises.push(crawler.launch());
            }


        }, 30000);

        await Promise.all(allPromises);
        clearInterval(stats);
    }

    async close() {
        try {
            await Promise.all(this.crawlers.map(crawler => crawler.close()));
            this.logger.info('Closed all crawlers');
        } catch (e) {
            this.logger.error(`Error when closing browser: ${e.message}`);
        }
    }

    addTask(task) {
        this.queue.addTask(task);
    }

}

module.exports = CrawlerPool;
