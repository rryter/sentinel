function testFunction(): void {
  console.log("Hello, world!");
  debugger; // This should be detected by our rule
}

class TestClass {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  sayHello(): void {
    console.log(`Hello, ${this.name}!`);
  }
}

export { testFunction, TestClass }; 