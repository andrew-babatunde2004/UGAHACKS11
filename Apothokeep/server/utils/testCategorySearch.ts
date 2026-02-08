import { getCategoryNameById } from "./categorySearch";

const testCases = [
    { id: 1, expected: "Baby Food" },
    { id: 7, expected: "Dairy Products & Eggs" },
    { id: 25, expected: "Deli & Prepared Foods" },
    { id: 999, expected: null },
];

testCases.forEach(({ id, expected }) => {
    const result = getCategoryNameById(id);
    console.log(`ID: ${id}, Expected: ${expected}, Got: ${result}, Pass: ${result === expected}`);
});
