// function Cat() {
//     this.name = "dadf";
// }

// Cat.prototype.smell = function () {
//     alert(this.name);
// }
// cat = new Cat();
// cat.smell();

var name = "John";
var age = 19;
var message = `My name is ${name} and I am ${age} years old`;
console.log(message);
age = 20;
console.log(message);

// var hello='sdfadfadfa'
// var s1 = "stess is {0}";
// console.log(s1.format('sdsds'))
// String.prototype.format = function(args) {
//     var result = this;
//     if (arguments.length > 0) {    
//         if (arguments.length == 1 && typeof (args) == "object") {
//             for (var key in args) {
//                 if(args[key]!=undefined){
//                     var reg = new RegExp("({" + key + "})", "g");
//                     result = result.replace(reg, args[key]);
//                 }
//             }
//         }
//         else {
//             for (var i = 0; i < arguments.length; i++) {
//                 if (arguments[i] != undefined) {
//                     //var reg = new RegExp("({[" + i + "]})", "g");//这个在索引大于9时会有问题
//                     var reg = new RegExp("({)" + i + "(})", "g");
//                     result = result.replace(reg, arguments[i]);
//              }
//           }
//        }
//    }
//    return result;
// }