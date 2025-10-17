import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ConfidentialZama, ConfidentialZama__factory, ZamaNFT, ZamaNFT__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("ZamaNFT", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  let czama: ConfidentialZama;
  let zamaNft: ZamaNFT;
  let czamaAddress: string;
  let zamaNftAddress: string;

  before(async function () {
    const [first, second, third] = await ethers.getSigners();
    deployer = first;
    alice = second;
    bob = third;
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    const czamaFactory = (await ethers.getContractFactory("ConfidentialZama")) as ConfidentialZama__factory;
    czama = (await czamaFactory.deploy()) as ConfidentialZama;
    await czama.waitForDeployment();
    czamaAddress = await czama.getAddress();

    const zamaNftFactory = (await ethers.getContractFactory("ZamaNFT")) as ZamaNFT__factory;
    zamaNft = (await zamaNftFactory.deploy(czamaAddress, "https://zama.example/api/token/")) as ZamaNFT;
    await zamaNft.waitForDeployment();
    zamaNftAddress = await zamaNft.getAddress();

    await czama.connect(deployer).setMinter(zamaNftAddress);
  });

  it("mints an NFT with an encrypted allocation and allows claiming once", async function () {
    const mintTx = await zamaNft.connect(alice).mint();
    await mintTx.wait();

    const totalMinted = await zamaNft.totalMinted();
    expect(totalMinted).to.eq(1n);

    const encryptedAllocation = await zamaNft.getEncryptedAllocation(totalMinted);
    expect(encryptedAllocation).to.not.eq(ethers.ZeroHash);

    await fhevm.initializeCLIApi();

    const clearAllocation = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAllocation,
      zamaNftAddress,
      alice,
    );

    expect(clearAllocation).to.be.greaterThanOrEqual(1);
    expect(clearAllocation).to.be.lessThanOrEqual(100);

    const claimTx = await zamaNft.connect(alice).mintToken(totalMinted);
    await claimTx.wait();

    const encryptedBalance = await czama.confidentialBalanceOf(alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      czamaAddress,
      alice,
    );

    expect(clearBalance).to.eq(clearAllocation);
    expect(await zamaNft.isRewardClaimed(totalMinted)).to.eq(true);

    await expect(zamaNft.connect(alice).mintToken(totalMinted))
      .to.be.revertedWithCustomError(zamaNft, "ZamaNFTAlreadyClaimed")
      .withArgs(totalMinted);
  });

  it("prevents non-owners from claiming", async function () {
    const mintTx = await zamaNft.connect(alice).mint();
    await mintTx.wait();

    const tokenId = await zamaNft.totalMinted();

    await expect(zamaNft.connect(bob).mintToken(tokenId))
      .to.be.revertedWithCustomError(zamaNft, "ZamaNFTUnauthorized")
      .withArgs(bob.address, tokenId);
  });
});
