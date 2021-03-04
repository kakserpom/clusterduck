const res = [[123]];


if (0) {
    const {encode, decode, decodeGen} = require('redis-proto');

    console.log(encode(res))
}

if (1) {
    var hiredis = require("hiredis"),
        reader = new hiredis.Reader();

    function feedAndGet(s) {
        reader.feed(s)
        console.log(reader.get())
        console.log(reader.get())
    }

    feedAndGet("-test\r\n-testtest\r\n");

// Reply comes out
    // => "hello"
}
if (0) {
    function encode() {
        const {Response} = require('redis-protocol/lib/encoder');
        let encoded = ''
        let response = new Response({
            write: function (chunk) {
                encoded += chunk
            }
        });
        (function () {
            this.encode(res)
        }).call(response)
        console.log(encoded)
    }
}