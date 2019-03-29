class Queue {
    constructor () {
      this.tasks = [];
      this.numTotalTasks = 0;
      this.numTasksDone = 0;
    }

    /**
     * @param tasks: array of tasks
     A task take as parameter a Puppeteer page object and a data object, containing
     at least an url property and an action property
     */
    init(tasks) {
        this.tasks = tasks.map(task => task);
    }

    addTask(task) {
        this.tasks.push(task);
        this.numTotalTasks++;
    }

    getTask() {
        const task = this.tasks.pop();
        this.numTasksDone++;
        return task;
    }
}

module.exports = Queue;
