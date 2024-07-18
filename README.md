# Scroll Canvas NFT minter

This project is an automation script to facilitate the minting of NFTs Chain Pulse. The script uses proxy servers for enhanced security and dynamic gas price fetching.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Utilities](#utilities)
- [Logging](#logging)


## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Ethereum wallet private keys stored in `wallets.txt`
- Proxy server list stored in `proxies.txt`

## Installation

1. Clone the repository:
   ```sh 
   bash
   git clone https://github.com/yourusername/nft-minting-automation.git
   cd nft-minting-automation
   ```

2. Install dependencies:
    ```sh
    npm i
    ```

3. Add your environment variables (.env file)

## Usage

1. Ensure that your wallets.txt file contains private keys, each on a new line.
2. Ensure that your proxies.txt file contains proxy server addresses, each on a new line.
3. Run the script:
    ```sh
    node index.js
    ```
## Utilities
generateRandom: Generates a random username.
logToFile: Logs messages to a file.
readProxies: Reads proxy server addresses from a file.
getSignatureBytes: Gets signature bytes for a transaction.
getGasPrices: Fetches dynamic gas prices via proxy servers.

## Logging
The script logs detailed information about each transaction, including successes, errors, and account balances, to a log file. This helps in debugging and record-keeping.


Enjoy! 
```sh
       _                            _ _   
__   _| | __ _ ___    _   _ ___  __| | |_ 
\ \ / / |/ _` / __|  | | | / __|/ _` | __|
 \ V /| | (_| \__ \  | |_| \__ \ (_| | |_ 
  \_/ |_|\__,_|___/___\__,_|___/\__,_|\__|
                 |_____|                  
```