// The reference FizzBuzzPop solution that every earlier lesson must have
// prepared the learner to write. Shared by the coverage + pyodide tests so the
// contract is defined in exactly one place.
export const FIZZBUZZPOP_REFERENCE = `n = 21
for i in range(1, n + 1):
    label = ""
    if i % 3 == 0:
        label = label + "Fizz"
    if i % 5 == 0:
        label = label + "Buzz"
    if i % 7 == 0:
        label = label + "Pop"
    if label == "":
        print(i)
    else:
        print(label)
`
