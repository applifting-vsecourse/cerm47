/** The server refused because the poll closed (HTTP 409), as opposed to a failure that may pass. */
export class PollClosedError extends Error {
  constructor() {
    super("This poll is closed.")
    this.name = "PollClosedError"
  }
}
