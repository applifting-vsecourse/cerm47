# Architecture decision records

One file per decision that is hard to undo and reaches beyond a single feature. Check this index before changing the data model or the structure of the app. Each file is named `NNNN-short-name.md`, with Status, Context, Decision, Options considered and Consequences.

| #                                   | Title                                                           | Status   | Summary                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-anonymous-tombstone.md) | A deleted quack that has replies becomes an anonymous tombstone | Proposed | A quack with replies stays as an empty row with no author (`Quack.userId` becomes nullable), so replies survive and its content is gone. |
