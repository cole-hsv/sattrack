var chalk = require('chalk');
var moment = require('moment');
moment().format();


console.log(chalk.yellow("\nPrototype test"));

function Dog(breed) {
    this.breed = breed;
};
// add the sayHello method to the Dog class
// so all dogs now can say hello
Dog.prototype.sayHello = function() {
    console.log("Hello this is a " + this.breed + " dog");
}
var yourDog = new Dog("golden retriever");
yourDog.sayHello();

var myDog = new Dog("dachshund");
myDog.sayHello();

//moments
console.log(chalk.yellow("moment test"));
var a = moment('2016-01-01');
var b = a.clone().add(1, 'week');
//var b = a.add(1, 'week');
// a.format();
console.log(a.format(), '\n', b.format());
now = moment();
now1 = now.format('LLLL');
now2 = now.format('LTS');
console.log(now1, '\t', now2);
