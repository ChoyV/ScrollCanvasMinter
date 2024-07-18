import { ethers } from 'ethers';
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import { generateRandom } from './utils/generateRandomLogin.js';
import { logToFile } from './utils/logToFile.js';
import { readProxies } from './utils/readProxies.js';
import { getSignatureBytes } from './utils/getSignatureBytes.js';
import { getGasPrices } from './utils/getGasPrices.js'; // Import the getGasPrices function

dotenv.config(); // Load environment variables from .env file

// Initialize Provider
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);

// Load proxies from file
const proxies = readProxies();

// Function to read and process each wallet from the file
async function main() {
    try {
        const privateKeys = fs.readFileSync('wallets.txt', 'utf8').trim().split('\n');
        for (let i = 0; i < privateKeys.length; i++) {
            const privateKey = privateKeys[i];
            const proxy = proxies[i % proxies.length];
            await action(privateKey, provider, proxy);
            // Generate a random time delay between MIN_TIME and MAX_TIME seconds
            const randomDelay = Math.floor(Math.random() * (parseInt(process.env.MAX_TIME) - parseInt(process.env.MIN_TIME) + 1)) + parseInt(process.env.MIN_TIME);
            console.log(`Waiting for ${randomDelay} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
        }
        console.log('== DONE ==');
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        logToFile(`ERROR - ${error}`);
    }
}

// Function to perform the minting action
async function action(privateKey, provider, proxy) {
    const wallet = new ethers.Wallet(privateKey, provider);

    let abi;
    try {
        abi = JSON.parse(process.env.ABI);
    } catch (error) {
        console.error('Failed to parse ABI:', error);
        logToFile(`ERROR - Failed to parse ABI: ${error}`);
        return;
    }

    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
        console.error('Contract address is not set in the environment variables');
        return;
    }

    let contract;
    try {
        contract = new ethers.Contract(contractAddress, abi, wallet);
    } catch (error) {
        console.error('Failed to initialize contract:', error);
        logToFile(`ERROR - Failed to initialize contract: ${error}`);
        return;
    }

    const randomUsername = generateRandom();

    let refData = await getSignatureBytes(wallet, proxy);
    await new Promise((resolve) => setTimeout(resolve, 44));

    if (!refData) {
        console.warn('No referral data found, using empty bytes');
        refData = '0x';
    }
    const amountInWei = refData ? ethers.utils.parseUnits('0.0005', 'ether') : ethers.utils.parseUnits('0.001', 'ether');

    // Check account balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Account Balance: ${ethers.utils.formatEther(balance)} ETH`);
    logToFile(`Balance: ${ethers.utils.formatEther(balance)} ETH - WALLET : ${wallet.address}`);

    // Fetch dynamic gas prices via proxy
    const gasPrices = await getGasPrices(proxy);
    if (!gasPrices || !gasPrices.gasPrice || !gasPrices.maxPriorityFeePerGas) {
        console.error('Failed to fetch gas prices');
        return;
    }

    // Estimate gas limit
    let gasLimit;
    try {
        gasLimit = await contract.estimateGas.mint(randomUsername, refData, { value: amountInWei });
    } catch (error) {
        console.error('Failed to estimate gas limit:', error);
        logToFile(`ERROR - Failed to estimate gas limit: ${error}`);
        return;
    }

    const transactionCost = gasLimit.mul(gasPrices.gasPrice).add(amountInWei);

    if (balance.lt(transactionCost)) {
        console.error('Insufficient funds for transaction');
        logToFile(`ERROR - Insufficient funds for transaction - WALLET : ${wallet.address}`);
        return;
    }

    logToFile(`Gas Price: ${ethers.utils.formatUnits(gasPrices.gasPrice, 'gwei')} gwei - WALLET : ${wallet.address}`);

    try {
        // Create transaction data
        const txData = await contract.interface.encodeFunctionData("mint", [randomUsername, refData]);
        console.log(txData);
        // Create raw transaction
        const tx = {
            to: contractAddress,
            value: amountInWei,
            data: txData,
            gasLimit: gasLimit,
            maxFeePerGas: gasPrices.gasPrice,
            maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas
        };

        // Send transaction
        const txResponse = await wallet.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log('Successful mint!\nTransaction Hash:', receipt.transactionHash);
        logToFile(`SUCCESS - Minted ${ethers.utils.formatUnits(amountInWei, 'ether')} ETH - Tx Hash: ${receipt.transactionHash} - WALLET : ${wallet.address}`);
    } catch (error) {
        console.error('An error occurred during the minting process:', error);
        logToFile(`ERROR - ${error.message}`);

        // Log more detailed error information
        if (error.code) {
            console.error('Error Code:', error.code);
            logToFile(`ERROR CODE - ${error.code}`);
        }
        if (error.transaction) {
            console.error('Error Transaction:', error.transaction);
            logToFile(`ERROR TRANSACTION - ${JSON.stringify(error.transaction)}`);
        }
        if (error.receipt) {
            console.error('Error Receipt:', error.receipt);
            logToFile(`ERROR RECEIPT - ${JSON.stringify(error.receipt)}`);
        }

        if (error.body) {
            const errorBody = JSON.parse(error.body);
            if (errorBody.error && errorBody.error.data) {
                const revertReason = decodeRevertReason(errorBody.error.data);
                console.error('Revert Reason:', revertReason);
                logToFile(`REVERT REASON - ${revertReason}`);
            }
        }
    }
}

// Execute the main function
main();