import * as dotenv from "dotenv";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

dotenv.config();

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, execute, read, log } = hre.deployments;

  const baseTokenURI = process.env.ZAMA_NFT_BASE_URI ?? "https://zama.example/api/token/";

  const confidentialZama = await deploy("ConfidentialZama", {
    from: deployer,
    log: true,
  });

  const zamaNft = await deploy("ZamaNFT", {
    from: deployer,
    args: [confidentialZama.address, baseTokenURI],
    log: true,
  });

  const currentMinter = await read("ConfidentialZama", "minter");
  if (currentMinter.toLowerCase() !== zamaNft.address.toLowerCase()) {
    await execute("ConfidentialZama", { from: deployer, log: true }, "setMinter", zamaNft.address);
    log(`Updated ConfidentialZama minter to ${zamaNft.address}`);
  }
};

export default func;
func.id = "deploy_confidential_zama_stack";
func.tags = ["ConfidentialZama", "ZamaNFT"];
