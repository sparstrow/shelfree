import { moveLines } from './arrays'

describe('moveLines', () => {
  it('moves a row down past the target and up before it', () => {
    expect(moveLines(['a', 'b', 'c', 'd'], [0], 1)).toEqual(['b', 'a', 'c', 'd'])
    expect(moveLines(['a', 'b', 'c', 'd'], [3], 1)).toEqual(['a', 'd', 'b', 'c'])
    expect(moveLines(['a', 'b', 'c', 'd'], [0, 1], 3)).toEqual(['c', 'd', 'a', 'b'])
  })
})
