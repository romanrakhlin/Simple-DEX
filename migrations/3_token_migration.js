const SomeToken = artifacts.require("SomeStupidAssToken");

module.exports = async function (deployer) {
  await deployer.deploy(SomeToken);
};
