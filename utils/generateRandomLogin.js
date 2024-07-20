import { generate as generateRandomWord } from 'random-words';
import { count as randomWordsCount } from 'random-words';

// Function to generate a random integer between min and max (inclusive)
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandom() {
    const randomWord = generateRandomWord();
    const totalWordsCount = randomWordsCount();
    const randomNumber = getRandomInt(1, totalWordsCount); // Generate a random number

    // Decide where to place the number: before, inside, or after the word
    const placementOption = getRandomInt(1, 3); // 1: before, 2: inside, 3: after

    let result;

    switch (placementOption) {
        case 1:
            result = `${randomNumber}${randomWord}`; // Place number before the word
            break;
        case 2:
            const splitIndex = getRandomInt(1, randomWord.length - 1); // Random index to split the word
            result = `${randomWord.slice(0, splitIndex)}${randomNumber}${randomWord.slice(splitIndex)}`; // Place number inside the word
            break;
        case 3:
        default:
            result = `${randomWord}${randomNumber}`; // Place number after the word
            break;
    }

    return result;
}
