const sum = require("./sample-function");

test("adds 1 + 2 to equal 3", () => {
  let peopleA = {
    name: "GQSM",
  };
  peopleA.age = 25;

  //測試字串
  expect(peopleA.name).toBe("GQSM");

  //測試物件
  expect(peopleA).toEqual({ name: "GQSM", age: 25 });
  expect(peopleA.name).not.toBe("");

  // 數字
  expect(5).toBeGreaterThan(4);
  expect(5).toBeGreaterThanOrEqual(5);
  expect(5).toBeLessThan(6);
  expect(5).toBeLessThanOrEqual(5);
  expect(0.1 + 0.2).toBeCloseTo(0.3);

  // 陣列
  let arrA = ['A','B','C']
  expect(arrA).toContain("B");
  //搭配迴圈檢查每個位置都不等於空
  for (let i in arrA) {
    expect(arrA[i]).not.toBe('');
  }

  // function
  expect(sum(1, 2)).toBe(3);
  expect(sum(2)).toBe(2)

  // 判斷特殊值
  expect(true).toBeTruthy()
  expect(false).toBeFalsy()
  expect(null).toBeNull()
  expect(undefined).toBeUndefined()
  expect(null).toBeDefined()
});
