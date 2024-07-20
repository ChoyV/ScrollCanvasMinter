import axios from 'axios';

export async function checkEthereumYear(wallet, proxy) {
    const walletAddress = await wallet.getAddress(); // Ensure to await for the address retrieval
    const url = `https://canvas.scroll.cat/badge/check?badge=0x3dacAd961e5e2de850F5E027c70b56b5Afa5DfeD&recipient=${walletAddress}`;

    try {
        const response = await axios.get(url, {
            proxy: {
                host: proxy.host,
                port: proxy.port,
                auth: {
                    username: proxy.username,
                    password: proxy.password
                },
                protocol: 'http' // Adjust protocol based on your proxy setup (http or https)
            }
        });
        const signatureData = response.data.eligibility; // Access the signature property

        return signatureData;
    } catch (error) {
        console.error('Error fetching signature:', error.message);
        return null;
    }
}

export async function getTxDataEthereumYear(wallet, proxy) {
    const walletAddress = await wallet.getAddress();
    const url = `https://canvas.scroll.cat/badge/claim?badge=0x3dacAd961e5e2de850F5E027c70b56b5Afa5DfeD&recipient=${walletAddress}`;

    try {
        const response = await axios.get(url, {
            proxy: {
                host: proxy.host,
                port: proxy.port,
                auth: {
                    username: proxy.username,
                    password: proxy.password
                },
                protocol: 'http' // Adjust protocol based on your proxy setup (http or https)
            }
        });
        
        // Log the response to check the structure
        console.log('getTxDataEthereumYear response:', response.data);
        
        const addressTo = response.data.tx.to;
        const txData = response.data.tx.data;
        return { addressTo, txData };
    } catch (error) {
        console.error('Error fetching transaction data:', error.message);
        return null;
    }
}
