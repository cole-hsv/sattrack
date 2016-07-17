function hello() {
    console.log('hello world');
}

hello();
hello();

function foo(a) {
    return a * 2;
}

var bar = foo(4);

console.log('bar', bar);


function noop(x) {
    return x;
}

var str = noop('string');
var num = noop(2);
var obj = noop({
    foo: 'bar'
});

function example_func(a, b, c, d) {
    console.log('example', a, b, c, d);
    d.callme();
    return {
        x: 1,
        y: 2,
        z: 'a string'
    };
}

var bar = example_func(1, 'foo', ['array', 'string', 1], {
    im: 'an',
    ob: 'ject',
    callme: function(j, k) {
        console.log('in a funciton on a object');
    }

});
console.log('example result', bar);
