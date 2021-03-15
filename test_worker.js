const {
    Worker, isMainThread, parentPort, workerData
} = require('worker_threads');
const script = workerData;

parentPort.postMessage(script);
