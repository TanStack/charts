export class CellTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Cell exceeded ${timeoutMs} ms.`)
    this.name = 'CellTimeoutError'
  }
}
