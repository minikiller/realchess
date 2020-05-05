function Cat() {
    this.name = "dadf";
}

Cat.prototype.smell = function () {
    alert(this.name);
}
cat = new Cat();
cat.smell();