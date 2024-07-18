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

    return `${randomWord}${randomNumber}`;
}
