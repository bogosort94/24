
// Mocking the solver logic from script.js to test it
function solve24(nums) {
    if (nums.length !== 4) return null;

    const ops = ['+', '-', '*', '/'];
    const permutations = getPermutations(nums);

    for (let p of permutations) {
        for (let op1 of ops) {
            for (let op2 of ops) {
                for (let op3 of ops) {
                    const expressions = [
                        `(({0} ${op1} {1}) ${op2} {2}) ${op3} {3}`,
                        `({0} ${op1} ({1} ${op2} {2})) ${op3} {3}`,
                        `{0} ${op1} (({1} ${op2} {2}) ${op3} {3})`,
                        `{0} ${op1} ({1} ${op2} ({2} ${op3} {3}))`,
                        `({0} ${op1} {1}) ${op2} ({2} ${op3} {3})`
                    ];

                    for (let expr of expressions) {
                        const filled = expr
                            .replace('{0}', p[0])
                            .replace('{1}', p[1])
                            .replace('{2}', p[2])
                            .replace('{3}', p[3]);

                        try {
                            const res = eval(filled);
                            if (Math.abs(res - 24) < 0.0001) {
                                return filled;
                            }
                        } catch (e) {
                        }
                    }
                }
            }
        }
    }
    return null;
}

function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    let output = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr.slice();
        const element = current.splice(i, 1)[0];
        const remaining = getPermutations(current);
        for (let j = 0; j < remaining.length; j++) {
            output.push([element].concat(remaining[j]));
        }
    }
    return output;
}

// Test cases
console.log("Running Tests...");

// 1. Unsolvable (1, 1, 1, 1) -> Should be null
const case1 = solve24([1, 1, 1, 1]);
console.log("Test 1 (1,1,1,1):", case1 === null ? "PASS" : "FAIL", case1);

// 2. Solvable (4, 6, 1, 1) -> 4 * 6 * 1 * 1
const case2 = solve24([4, 6, 1, 1]);
console.log("Test 2 (4,6,1,1):", case2 ? "PASS" : "FAIL", case2);
if (case2) console.log("Eval check:", eval(case2));

// 3. Solvable (8, 3, 8, 3) -> 8 / (3 - 8/3) ... tricky one often used in 24 game context
// Wait, 8/(3-8/3) = 8/(1/3) = 24. This requires fractions. 
// My simple eval might handle it if JS floating point precision is good enough? 
// 8 / (3 - (8/3))
const case3 = solve24([8, 3, 8, 3]);
console.log("Test 3 (8,3,8,3):", case3 ? "PASS" : "FAIL", case3);
if (case3) console.log("Eval check:", eval(case3));

// 4. Random solvable
const case4 = solve24([5, 5, 5, 1]); // (5 - 1/5) * 5 = 24
console.log("Test 4 (5,5,5,1):", case4 ? "PASS" : "FAIL", case4);
if (case4) console.log("Eval check:", eval(case4));
