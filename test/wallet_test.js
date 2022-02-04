const SomeToken = artifacts.require("SomeStupidAssToken");
const DEX = artifacts.require("DEX");

// THE TEST ARE RUN THE MIGRATIONS AND THEN THEMSELVES!!!!
// It's need because the migration can be overfloaded with code of test etc.
// and the migration happens before tests.
// so in migration we only need to write the code that we lazy to write in order it to start every time we change something
// and in test we have to separate and do only testing assertions etc.

// to be able to test stuff
const truffleAssert = require("truffle-assertions");

contract("DEX", accounts => {
	it ("should only be possible for owner to add tokens", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();

		// we assume that this gonna pass
		await truffleAssert.passes(
			my_dex.addToken(web3.utils.fromUtf8("SSAT"), some_token.address, {from: accounts[0]})
		);

		// we assume that this gonna fail
		await truffleAssert.reverts(
			my_dex.addToken(web3.utils.fromUtf8("SSAT"), some_token.address, {from: accounts[1]})
		);
	})

	it ("should handle deposits correctly", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();
		await some_token.approve(my_dex.address, 400)
		await my_dex.deposit(100, web3.utils.fromUtf8("SSAT"));

		// check that after that our balance will be equal to 100
		let balance = await my_dex.balances(accounts[0], web3.utils.fromUtf8("SSAT"));
		assert.equal(balance.toNumber(), 100);
	})

	it ("should handle faulty withdraw correctly", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();
		await truffleAssert.reverts(my_dex.withdraw(500, web3.utils.fromUtf8("SSAT")));
	})

	it ("should handle correct withdraw correctly", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();
		await truffleAssert.passes(my_dex.withdraw(100, web3.utils.fromUtf8("SSAT")));
	})
})