const {test} = require('uvu');
const assert = require('uvu/assert')

const Collection = require('../misc/collection')

const banana = {name: 'banana', color: 'yellow'}
const cucumber = {name: 'cucumber', color: 'green'}

test('add', () => {
    const fruits = new Collection('name')
    fruits.add(banana, cucumber)

    assert.is(fruits.get('banana'), banana)
    assert.is(fruits.get('cucumber'), cucumber)
})

test('events', () => {
    const fruits = new Collection('name')

    let quantity = 0, counter = 0
    fruits.on('inserted', () => ++quantity)
    fruits.on('deleted', () => --quantity)
    fruits.on('all', () => ++counter)

    fruits.add(cucumber)
    assert.is(quantity, 1)

    fruits.add(banana)
    assert.is(quantity, 2)

    fruits.add(cucumber)
    assert.is(quantity, 2)

    fruits.remove(cucumber)
    assert.is(quantity, 1)

    fruits.remove(cucumber)
    assert.is(quantity, 1)

    fruits.remove('banana')
    assert.is(quantity, 0)

    assert.is(counter, 6)

    fruits.set('cucumber', cucumber)
    assert.is(quantity, 1)
})

test.run()
