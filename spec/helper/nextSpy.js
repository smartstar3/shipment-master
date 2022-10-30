class NextSpy {
    constructor () {
        this.errors = [];
        this.counter = 0;
    }

    next (err) {
        this.counter++;
        if (err instanceof Error) {
            this.errors.push(err);
        }
    }
}

const getNextFn = () => {
    const spy = new NextSpy();
    const nextFn = (err) => spy.next(err);
    return { nextFn, spy };
};

module.exports = {
    getNextFn,
    NextSpy
};
