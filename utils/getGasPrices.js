import { ethers } from 'ethers';

// Function to create a provider with proxy
function createProviderWithProxy(proxy) {
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    return new ethers.providers.JsonRpcProvider({
        url: process.env.RPC,
        headers: {
            'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')}`
        },
        proxy: {
            host: proxy.host,
            port: proxy.port,
            auth: {
                username: proxy.username,
                password: proxy.password
            }
        }
    });
}

// Function to get current gas prices via proxy
export async function getGasPrices(proxy) {
    try {
        const customProvider = createProviderWithProxy(proxy);
        const gasPrice = await customProvider.getGasPrice();
        const maxPriorityFeePerGas = await customProvider.send('eth_maxPriorityFeePerGas', []);
        console.log(`Gas Price: ${gasPrice}, Max Priority Fee Per Gas: ${maxPriorityFeePerGas}`);
        return {
            gasPrice,
            maxPriorityFeePerGas: ethers.BigNumber.from(maxPriorityFeePerGas)
        };
    } catch (error) {
        console.error('Error fetching gas prices:', error.message);
        return null;
    }
}
