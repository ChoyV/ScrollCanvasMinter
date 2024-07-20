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

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);

const proxies = readProxies();

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
        for (let i = 0; i < privateKeys.length; i++) {
            const privateKey = privateKeys[i];
            const proxy = proxies[i % proxies.length];
            try {
                await action(privateKey, provider, proxy);
            } catch (error) {
                console.error(chalk.red(`Error with wallet ${privateKey}:`), error);
                logToFile(`ERROR with wallet ${privateKey} - ${error}`);
            }
            const randomDelay = Math.floor(Math.random() * (parseInt(process.env.MAX_TIME) - parseInt(process.env.MIN_TIME) + 1)) + parseInt(process.env.MIN_TIME);
            console.log(chalk.yellow(`Waiting for ${randomDelay} seconds...`));
            await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
        }
        console.log(chalk.green('Process completed! You re all good'));
    } catch (error) {
        console.error(chalk.red('An unexpected error occurred:'), error);
        logToFile(`ERROR - ${error}`);
    }
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
        console.error(chalk.red('Error in action function:'), error);
        logToFile(`ERROR - ${error}`);
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
        console.error(chalk.red('Failed to fetch gas prices'));
        return;
    }

    let gasLimit;
    try {
        gasLimit = await contract.estimateGas.mint(randomUsername, refData, { value: amountInWei });
    } catch (error) {
        console.error(chalk.red('Failed to estimate gas limit:'), error);
        logToFile(`ERROR - Failed to estimate gas limit: ${error}`);
        return;
    }

    const transactionCost = gasLimit.mul(gasPrices.gasPrice).add(amountInWei);

    if (balance.lt(transactionCost)) {
        console.error(chalk.red('Insufficient funds for transaction'));
        logToFile(`ERROR - Insufficient funds for transaction - WALLET : ${wallet.address}`);
        return;
    }

    logToFile(chalk.green(`Gas Price: ${ethers.utils.formatUnits(gasPrices.gasPrice, 'gwei')} gwei - WALLET : ${wallet.address}`));

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
        console.error(chalk.red('An error occurred during the minting process:'), error);
        logToFile(`ERROR - ${error.message}`);
        handleTransactionError(error);
    }
}

async function mintEthereumYear(wallet, proxy, provider) {
    try {
        const { addressTo, txData } = await getTxDataEthereumYear(wallet, proxy);
        const balance = await provider.getBalance(wallet.address);
        const gasPrices = await getGasPrices(proxy);

        if (!gasPrices || !gasPrices.gasPrice || !gasPrices.maxPriorityFeePerGas) {
            console.error(chalk.red('Failed to fetch gas prices'));
            return;
        }

        // Fixed gas limit
        const fixedGasLimit = ethers.BigNumber.from(720300); // 720,300 gas units

        const transactionCost = fixedGasLimit.mul(gasPrices.gasPrice);

        if (balance.lt(transactionCost)) {
            console.error(chalk.red('Insufficient funds for transaction to mint EthereumYear'));
            logToFile(`ERROR - Insufficient funds for transaction to mint EthereumYear - WALLET : ${wallet.address}`);
            return;
        }

        logToFile(chalk.green(`Gas Price: ${ethers.utils.formatUnits(gasPrices.gasPrice, 'gwei')} gwei - WALLET : ${wallet.address}`));

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
        console.error(chalk.red('Failed to send TX EthereumYear:'), error);
        logToFile(`ERROR - Failed to send TX EthereumYear: ${error}`);
    }
}

function handleTransactionError(error) {
    console.error(chalk.red('An error occurred during the transaction:'), error);
    logToFile(`ERROR - ${error.message}`);

    if (error.code) {
        console.error(chalk.red('Error Code:'), error.code);
        logToFile(`ERROR CODE - ${error.code}`);
    }
    if (error.transaction) {
        console.error(chalk.red('Error Transaction:'), error.transaction);
        logToFile(`ERROR TRANSACTION - ${JSON.stringify(error.transaction)}`);
    }
    if (error.receipt) {
        console.error(chalk.red('Error Receipt:'), error.receipt);
        logToFile(`ERROR RECEIPT - ${JSON.stringify(error.receipt)}`);
    }

    if (error.body) {
        const errorBody = JSON.parse(error.body);
        if (errorBody.error && errorBody.error.data) {
            const revertReason = decodeRevertReason(errorBody.error.data);
            console.error(chalk.red('Revert Reason:'), revertReason);
            logToFile(`REVERT REASON - ${revertReason}`);
        }
    }
}

main();
