import fs from 'fs';

export function readProxies() {
    try {
        const proxies = fs.readFileSync('proxy.txt', 'utf8').trim().split('\n');
        return proxies.map(proxyStr => {
            const [login, hostPort] = proxyStr.split('@');
            const [host, port] = hostPort.split(':');
            const [username, password] = login.split(':');
            return { host, port, username, password };
        });
    } catch (error) {
        console.error('Error reading proxies:', error.message);
        return [];
    }
}
