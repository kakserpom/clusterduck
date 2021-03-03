return module.exports = (timeoutMs, promise) => {
    let timeoutHandle;
    const timeoutPromise = new Promise((resolve, reject) => {
        timeoutHandle = setTimeout( () => {
            reject(new Error('Timed out'));
        }, timeoutMs)
    });

    return Promise.race([
        promise,
        timeoutPromise,
    ]).then((result) => {
        clearTimeout(timeoutHandle);
        return result;
    });
}
