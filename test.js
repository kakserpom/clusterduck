const Set = require('collections/sorted-set')
const names = new Set();
names.add({name: "Kris"});
console.log(names.filter(obj => obj.name !== 'Kris').toArray())