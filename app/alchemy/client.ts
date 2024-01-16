const { Network, Alchemy } = require('alchemy-sdk');

const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY, // Replace with your Alchemy API Key
  network: Network.ETH_MAINNET, // Replace with your network
};

const alchemy = new Alchemy(settings);

export default alchemy;
