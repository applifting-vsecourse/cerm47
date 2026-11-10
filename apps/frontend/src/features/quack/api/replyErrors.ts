/** The server refused because the quack was deleted meanwhile (HTTP 409), as opposed to a failure that may pass. */
export class QuackDeletedError extends Error {
  constructor() {
    super("This quack was deleted.")
    this.name = "QuackDeletedError"
  }
}
