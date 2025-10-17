import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:zama-addresses", "Prints the deployment addresses").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const czama = await deployments.get("ConfidentialZama");
  const zamaNft = await deployments.get("ZamaNFT");

  console.log(`ConfidentialZama address: ${czama.address}`);
  console.log(`ZamaNFT address        : ${zamaNft.address}`);
});

task("task:zama-mint", "Mints a new Zama NFT")
  .addOptionalParam("address", "Optionally specify the ZamaNFT address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    const zamaNftDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaNFT");

    const signer = (await ethers.getSigners())[0];
    const zamaNft = await ethers.getContractAt("ZamaNFT", zamaNftDeployment.address);

    const tx = await zamaNft.connect(signer).mint();
    const receipt = await tx.wait();

    const totalMinted = await zamaNft.totalMinted();
    const encryptedAllocation = await zamaNft.getEncryptedAllocation(totalMinted);

    console.log(`Mint transaction hash : ${tx.hash}`);
    console.log(`Token id              : ${totalMinted}`);
    console.log(`Encrypted allocation  : ${encryptedAllocation}`);
    console.log(`Gas used              : ${receipt?.gasUsed}`);
  });

task("task:zama-claim", "Claims cZama tokens for a given NFT")
  .addParam("tokenid", "The token id to claim for")
  .addOptionalParam("nft", "Optionally specify the ZamaNFT address")
  .addOptionalParam("czama", "Optionally specify the ConfidentialZama address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    const tokenId = BigInt(taskArguments.tokenid);

    const zamaNftDeployment = taskArguments.nft ? { address: taskArguments.nft } : await deployments.get("ZamaNFT");
    const czamaDeployment = taskArguments.czama
      ? { address: taskArguments.czama }
      : await deployments.get("ConfidentialZama");

    const signer = (await ethers.getSigners())[0];
    const zamaNft = await ethers.getContractAt("ZamaNFT", zamaNftDeployment.address);
    const czama = await ethers.getContractAt("ConfidentialZama", czamaDeployment.address);

    const tx = await zamaNft.connect(signer).mintToken(tokenId);
    const receipt = await tx.wait();
    console.log(`Claim transaction hash: ${tx.hash}`);
    console.log(`Gas used              : ${receipt?.gasUsed}`);

    await fhevm.initializeCLIApi();

    const encryptedBalance = await czama.confidentialBalanceOf(signer.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      czamaDeployment.address,
      signer,
    );

    console.log(`Encrypted balance     : ${encryptedBalance}`);
    console.log(`Clear balance         : ${clearBalance}`);
  });

task("task:zama-decrypt", "Decrypts the allocation for a token id")
  .addParam("tokenid", "The token id to decrypt")
  .addOptionalParam("address", "Optionally specify the ZamaNFT address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    const tokenId = BigInt(taskArguments.tokenid);
    const zamaNftDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaNFT");

    await fhevm.initializeCLIApi();

    const signer = (await ethers.getSigners())[0];
    const zamaNft = await ethers.getContractAt("ZamaNFT", zamaNftDeployment.address);

    const encryptedAllocation = await zamaNft.getEncryptedAllocation(tokenId);
    const clearAllocation = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAllocation,
      zamaNftDeployment.address,
      signer,
    );

    console.log(`Encrypted allocation  : ${encryptedAllocation}`);
    console.log(`Clear allocation      : ${clearAllocation}`);
  });
