# PDF Format Guide for Quiz Upload

To upload a quiz via PDF, format your questions as follows:

## Format Example:

```
Question 1: What is 1 + 1?
A) 1
B) 2
C) 3
D) 4
Correct Answer: B
Points: 1
Explanation: Basic addition (optional)

Question 2: What is 2 * 2?
A) 2
B) 3
C) 4
D) 5
Correct Answer: C
Points: 2
Explanation: Multiplication of 2 by 2 equals 4

Question 3: JavaScript is a programming language.
A) True
B) False
Correct Answer: A
Points: 1
```

## Format Rules:

1. **Question Format**: Start each question with "Question X:" or "QX:" where X is the question number
   - Alternative: Just use numbered format like "1.", "2.", etc.

2. **Options**: List options as:
   - `A) Option text`
   - `B) Option text`
   - `C) Option text`
   - `D) Option text`
   - Or use periods: `A. Option text`, `B. Option text`, etc.
   - Minimum 2 options required, maximum unlimited

3. **Correct Answer**: Specify with "Correct Answer: [A/B/C/D]"
   - Must match one of the option letters

4. **Points** (Optional): Specify with "Points: [number]"
   - Defaults to 1 if not specified

5. **Explanation** (Optional): Add explanation with "Explanation: [text]"
   - Will be shown to students after quiz completion

## Tips:

- Each question should be separated by a blank line or start with "Question X:"
- Options must be labeled A, B, C, D (or more if needed)
- The correct answer letter must match one of the option letters
- You can mix different point values for different questions
- Explanations are optional but recommended for better learning

## Example PDF Structure:

```
Quiz Title: Mathematics Basics

Question 1: What is the result of 5 + 3?
A) 6
B) 7
C) 8
D) 9
Correct Answer: C
Points: 1
Explanation: 5 + 3 = 8

Question 2: What is the square root of 16?
A) 2
B) 4
C) 6
D) 8
Correct Answer: B
Points: 2
Explanation: The square root of 16 is 4 because 4 × 4 = 16
```



