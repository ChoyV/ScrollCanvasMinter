import { ethers } from 'ethers';


// Function to get current gas prices via proxy
export async function checkProfileMinted(wallet,contract) {
    try {
        const getProfile = await contract.getProfile(wallet.address);
        const checkBool = await contract.isProfileMinted(getProfile);
        return checkBool;
        } catch (error) {
        console.log (error);
    }
}
