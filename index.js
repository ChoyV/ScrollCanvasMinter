import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateRandom } from './utils/generateRandomLogin.js';
import { logToFile } from './utils/logToFile.js';
import { readProxies } from './utils/readProxies.js';
import { getSignatureBytes } from './utils/getSignatureBytes.js';
import { getGasPrices } from './utils/getGasPrices.js';
import { checkProfileMinted } from './utils/checkProfileMinted.js';
import { checkEthereumYear, getTxDataEthereumYear } from './utils/checkEthereumYear.js';
import chalk from 'chalk';

dotenv.config();

const RPC_URLS = process.env.RPC.split(',');
let currentRpcIndex = 0;
let provider = new ethers.providers.JsonRpcProvider(RPC_URLS[currentRpcIndex]);

const proxies = readProxies();
let currentProxyIndex = 0;

let abi, abiEthYear;
try {
    abi = JSON.parse(process.env.ABI);
    abiEthYear = JSON.parse(process.env.ABI_ETH_YEAR);
} catch (error) {
    console.error(chalk.red('Failed to parse ABI:'), error);
    logToFile(`ERROR - Failed to parse ABI: ${error}`);
    process.exit(1);
}

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
    console.error(chalk.red('Contract address is not set in the environment variables'));
    process.exit(1);
}

async function main() {
    try {
        const privateKeys = fs.readFileSync('wallets.txt', 'utf8').trim().split('\n');
        if (process.env.WALLET_SHUFFLE === '1') {
            shuffleArray(privateKeys);
        }
        for (let i = 0; i < privateKeys.length; i++) {
            const privateKey = privateKeys[i];
            try {
                await actionWithRetry(privateKey, 2);
            } catch (error) {
                console.error(chalk.red(`Error with wallet ${privateKey}:`), error);
                logToFile(`ERROR with wallet ${privateKey} - ${error}`);
            }
            const randomDelay = Math.floor(Math.random() * (parseInt(process.env.MAX_TIME) - parseInt(process.env.MIN_TIME) + 1)) + parseInt(process.env.MIN_TIME);
            console.log(chalk.yellow(`Waiting for ${randomDelay} seconds...`));
            await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
        }
        console.log(chalk.green('Process completed! You\'re all good'));
    } catch (error) {
        console.error(chalk.red('An unexpected error occurred:'), error);
        logToFile(`ERROR - ${error}`);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function actionWithRetry(privateKey, retries) {
    let attempt = 0;
    while (true) {
        try {
            await action(privateKey, provider, proxies[currentProxyIndex]);
            return;
        } catch (error) {
            attempt++;
            console.error(chalk.red(`Attempt ${attempt} failed:`), error);
            logToFile(`ERROR - Attempt ${attempt} failed: ${error}`);
            rotateRpcAndProxy();
            console.log(chalk.yellow(`Rotating RPC URL to: ${RPC_URLS[currentRpcIndex]}`));
            console.log(chalk.yellow(`Rotating Proxy to: ${proxies[currentProxyIndex].host}`));
            if (attempt >= retries) {
                throw new Error('All attempts failed');
            }
        }
    }
}

function rotateRpcAndProxy() {
    currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length;
    provider = new ethers.providers.JsonRpcProvider(RPC_URLS[currentRpcIndex]);
    currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
}

async function action(privateKey, provider, proxy) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    try {
        if (await checkProfileMinted(wallet, contract)) {
            console.log(chalk.blue("Profile is already minted!"));
        } else {
            await mintProfile(wallet, contract, proxy);
        }
        if (await checkEthereumYear(wallet, proxy)) {
            await mintEthereumYear(wallet, proxy, provider);
        } else {
            console.log(chalk.orange("Not eligible"));
        }
    } catch (error) {
        throw new Error(`Error in action function: ${error.message}`);
    }
}

async function mintProfile(wallet, contract, proxy) {
    const randomUsername = generateRandom();
    let refData = await getSignatureBytes(wallet, proxy);
    await new Promise(resolve => setTimeout(resolve, 44));

    if (!refData) {
        console.warn(chalk.yellow('No referral data found, using empty bytes'));
        refData = '0x';
    }
    const amountInWei = refData ? ethers.utils.parseUnits('0.0005', 'ether') : ethers.utils.parseUnits('0.001', 'ether');

    const balance = await provider.getBalance(wallet.address);
    console.log(chalk.cyan(`Account Balance: ${ethers.utils.formatEther(balance)} ETH`));
    logToFile(`Balance: ${ethers.utils.formatEther(balance)} ETH - WALLET : ${wallet.address}`);

    const gasPrices = await getGasPrices(proxy);
    if (!gasPrices || !gasPrices.gasPrice || !gasPrices.maxPriorityFeePerGas) {
        throw new Error('Failed to fetch gas prices');
    }

    let gasLimit;
    try {
        gasLimit = await contract.estimateGas.mint(randomUsername, refData, { value: amountInWei });
    } catch (error) {
        throw new Error(`Failed to estimate gas limit: ${error.message}`);
    }

    const transactionCost = gasLimit.mul(gasPrices.gasPrice).add(amountInWei);

    if (balance.lt(transactionCost)) {
        throw new Error('Insufficient funds for transaction');
    }

    logToFile(`Gas Price: ${ethers.utils.formatUnits(gasPrices.gasPrice, 'gwei')} gwei - WALLET : ${wallet.address}`);

    try {
        const txData = contract.interface.encodeFunctionData("mint", [randomUsername, refData]);

        const tx = {
            to: contractAddress,
            value: amountInWei,
            data: txData,
            gasLimit: gasLimit,
            maxFeePerGas: gasPrices.gasPrice,
            maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas
        };

        const txResponse = await wallet.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log(chalk.green('Successful mint!\nTransaction Hash:'), receipt.transactionHash);
        logToFile(`SUCCESS - Minted ${ethers.utils.formatUnits(amountInWei, 'ether')} ETH - Tx Hash: ${receipt.transactionHash} - WALLET : ${wallet.address}`);
    } catch (error) {
        throw new Error(`An error occurred during the minting process: ${error.message}`);
    }
}

async function mintEthereumYear(wallet, proxy, provider) {
    try {
        const { addressTo, txData } = await getTxDataEthereumYear(wallet, proxy);
        const balance = await provider.getBalance(wallet.address);
        const gasPrices = await getGasPrices(proxy);

        if (!gasPrices || !gasPrices.gasPrice || !gasPrices.maxPriorityFeePerGas) {
            throw new Error('Failed to fetch gas prices');
        }

        // Fixed gas limit
        const fixedGasLimit = ethers.BigNumber.from(720300); // 720,300 gas units

        const transactionCost = fixedGasLimit.mul(gasPrices.gasPrice);

        if (balance.lt(transactionCost)) {
            throw new Error('Insufficient funds for transaction to mint EthereumYear');
        }

        logToFile(`Gas Price: ${ethers.utils.formatUnits(gasPrices.gasPrice, 'gwei')} gwei - WALLET : ${wallet.address}`);

        const tx = {
            to: addressTo,
            data: txData,
            gasLimit: fixedGasLimit,
            maxFeePerGas: gasPrices.gasPrice,
            maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas
        };

        const txResponse = await wallet.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log(chalk.green('Successful mint ETH_Year_NFT!\nTransaction Hash:'), receipt.transactionHash);
        logToFile(`SUCCESS - Minted ETH_Year_NFT - Tx Hash: ${receipt.transactionHash} - WALLET : ${wallet.address}`);
    } catch (error) {
        throw new Error(`Failed to send TX EthereumYear: ${error.message}`);
    }
}

main();
