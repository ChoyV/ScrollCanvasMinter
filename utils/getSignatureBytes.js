import axios from 'axios';

export async function getSignatureBytes(wallet, proxy) {
    const walletAddress = await wallet.getAddress(); // Ensure to await for the address retrieval
    const url = `https://canvas.scroll.cat/code/${process.env.REF}/sig/${walletAddress}`;

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
        const signatureData = response.data.signature; // Access the signature property

        return signatureData;
    } catch (error) {
        console.error('Error fetching signature:', error.message);
        return null;
    }
}
