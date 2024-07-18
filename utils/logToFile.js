import fs from 'fs';

export function logToFile(message) {
    fs.appendFileSync('log.txt', `${new Date().toISOString()} - ${message}\n`, 'utf8');
}