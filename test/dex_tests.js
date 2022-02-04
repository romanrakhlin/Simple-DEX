const SomeToken = artifacts.require("SomeStupidAssToken");
const DEX = artifacts.require("DEX");

// to be able to test stuff
const truffleAssert = require("truffle-assertions");

contract("DEX", accounts => {
	it("should throw an error if ETH balnce is too low when when creating buylimit order", async () => {
		let some_token = await SomeToken.deployed()
		let my_dex = await DEX.deployed();

		// we assume that this gonna fail
		await truffleAssert.reverts(
			my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 10, 1)
		);

		// we assume that this gonna pass
		await my_dex.depositEth({value: 10});
		await truffleAssert.passes(
			my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 10, 1)
		);


		// await truffleAssert.reverts(dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),35)); //buy market order
		//    await dex.depositETH({value: 100000});
		//    await truffleAssert.passes(dex.createMarketOrder(0,web3.utils.fromUtf8("LINK"),35)); //buy market order
	})

	it("should throw an error of token balance is too low when creatig sell limit order", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();
		
		await truffleAssert.reverts(
			my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 10, 1)
		);
		await some_token.approve(my_dex.address, 400);
		await my_dex.addToken(web3.utils.fromUtf8("SSAT"), some_token.address, {from: accounts[0]});
		await my_dex.deposit(10, web3.utils.fromUtf8("SSAT"));
		await truffleAssert.passes(
			my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 10, 1)
		);
	})

	it("the buy order book should be ordered on price from highest to lowest starting at index 0", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();
		await some_token.approve(my_dex.address, 500);
		await my_dex.depositEth({value: 3000});
		await my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 1, 300);
		await my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 1, 100);
		await my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 1, 200);

		let orderBook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 0);
		assert(orderBook.length > 0);
		for (let i = 0; i < orderBook.length - 1; i++) {
			assert(orderBook[i].price >= orderBook[i + 1].price, "the order is not right in buy book");
		}
	})

	it("the sell order book should be ordered on price from lowest to highest starting at index 0", async () => {
		let some_token = await SomeToken.deployed();
		let my_dex = await DEX.deployed();
		await some_token.approve(my_dex.address, 500);
		await my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 1, 300);
		await my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 1, 100);
		await my_dex.createLimitOrder(0, web3.utils.fromUtf8("SSAT"), 1, 200);

		let orderBook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1);
		assert(orderBook.length > 0);
		for (let i = 0; i < orderBook.length - 1; i++) {
			assert(orderBook[i].price <= orderBook[i + 1].price, "the order is not right in buy book");
		}
	})
})