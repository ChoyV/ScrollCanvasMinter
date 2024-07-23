import axios from 'axios';

export async function getSignatureBytes(wallet, proxy) {
    const walletAddress = await wallet.getAddress();
    const url = `https://canvas.scroll.cat/code/${process.env.REF}/sig/${walletAddress}`;

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
            const signatureData = response.data.signature;
            if (signatureData) {
                return signatureData;
            }
        } catch (error) {
            console.error('Error fetching signature:', error.message);
        }
        const randomDelay = Math.floor(Math.random() * (15 - 6 + 1)) + 6;
        console.log(chalk.yellow(`Retrying in ${randomDelay} seconds...`));
        await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
    }
}
