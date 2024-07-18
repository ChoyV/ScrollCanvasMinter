import { generate as generateRandomWord, count as randomWordCount } from 'random-words';

export function generateRandom() {
    return generateRandomWord() + randomWordCount();
}