import axios from 'axios';

export async function checkEthereumYear(wallet, proxy) {
    const walletAddress = await wallet.getAddress();
    const url = `https://canvas.scroll.cat/badge/check?badge=0x3dacAd961e5e2de850F5E027c70b56b5Afa5DfeD&recipient=${walletAddress}`;

    while (true) {
        try {
            const response = await axios.get(url, {
                proxy: {
                    host: proxy.host,
                    port: proxy.port,
                    auth: {
                        username: proxy.username,
                        password: proxy.password
                    },
                    protocol: 'http'
                }
            });
            const eligibility = response.data.eligibility;
            if (eligibility) {
                return eligibility;
            }
        } catch (error) {
            console.error('Error checking EthereumYear:', error.message);
        }
        const randomDelay = Math.floor(Math.random() * (15 - 6 + 1)) + 6;
        console.log(chalk.yellow(`Retrying in ${randomDelay} seconds...`));
        await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
    }
}


export async function getTxDataEthereumYear(wallet, proxy) {
    const walletAddress = await wallet.getAddress();
    const url = `https://canvas.scroll.cat/badge/claim?badge=0x3dacAd961e5e2de850F5E027c70b56b5Afa5DfeD&recipient=${walletAddress}`;

    while (true) {
        try {
            const response = await axios.get(url, {
                proxy: {
                    host: proxy.host,
                    port: proxy.port,
                    auth: {
                        username: proxy.username,
                        password: proxy.password
                    },
                    protocol: 'http'
                }
            });
            console.log('getTxDataEthereumYear response:', response.data);
            const addressTo = response.data.tx.to;
            const txData = response.data.tx.data;
            if (addressTo && txData) {
                return { addressTo, txData };
            }
        } catch (error) {
            console.error('Error fetching transaction data:', error.message);
        }
        const randomDelay = Math.floor(Math.random() * (15 - 6 + 1)) + 6;
        console.log(chalk.yellow(`Retrying in ${randomDelay} seconds...`));
        await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
    }

}
