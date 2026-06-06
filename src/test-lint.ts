// Cognitive Complexity が高い関数 (15以上) と、50行を超える関数
export function complexFunction(a: number, b: number): number {
  let result = 0
  if (a > 0) {
    if (b > 0) {
      for (let i = 0; i < a; i++) {
        if (i % 2 === 0) {
          result += b
        } else {
          for (let j = 0; j < b; j++) {
            if (j % 3 === 0) {
              result += 1
            } else {
              result -= 1
            }
          }
        }
      }
    } else {
      result = -1
    }
  } else {
    result = -2
  }

  // 50行を超えるためのダミー行
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1
  result += 1

  return result
}
