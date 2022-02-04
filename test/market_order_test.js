const DEX = artifacts.require("DEX");
const SomeToken = artifacts.require("SomeStupidAssToken");

// to be able to test stuff
const truffleAssert = require('truffle-assertions');

contract("DEX", accounts => {

    //When creating a SELL market order, the seller needs to have enough tokens for the trade
    it ("Should throw an error when creating a sell market order without adequate token balance", async () => {
        let my_dex = await DEX.deployed();

        let balance = await my_dex.balances(accounts[0], web3.utils.fromUtf8("SSAT"));
        assert.equal(balance.toNumber(), 0, "Initial SSAT balance is not 0");

        await truffleAssert.reverts(
            my_dex.createMarketOrder(1, web3.utils.fromUtf8("SSAT"), 10)
        );
    })

    //Market orders can be submitted even if the order book is empty
    it ("Market orders can be submitted even if the order book is empty", async () => {
        let my_dex = await DEX.deployed()
        
        await my_dex.depositEth({value: 50000});

        let orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 0); //Get buy side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");
        
        await truffleAssert.passes(
            my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 10)
        )

        await truffleAssert.passes(
            my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 10)
        )
    })

    //Market orders should be filled until the order book is empty or the market order is 100% filled
    it ("Market orders should not fill more limit orders than the market order amount", async () => {
        let my_dex = await DEX.deployed()
        let some_token = await SomeToken.deployed()

        let orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await my_dex.addToken(web3.utils.fromUtf8("SSAT"), some_token.address)


        //Send LINK tokens to accounts 1, 2, 3 from account 0
        await some_token.transfer(accounts[1], 150)
        await some_token.transfer(accounts[2], 150)
        await some_token.transfer(accounts[3], 150)

        //Approve DEX for accounts 1, 2, 3
        await some_token.approve(my_dex.address, 50, {from: accounts[1]});
        await some_token.approve(my_dex.address, 50, {from: accounts[2]});
        await some_token.approve(my_dex.address, 50, {from: accounts[3]});

        //Deposit LINK into DEX for accounts 1, 2, 3
        await my_dex.deposit(50, web3.utils.fromUtf8("SSAT"), {from: accounts[1]});
        await my_dex.deposit(50, web3.utils.fromUtf8("SSAT"), {from: accounts[2]});
        await my_dex.deposit(50, web3.utils.fromUtf8("SSAT"), {from: accounts[3]});

        //Fill up the sell order book
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 300, {from: accounts[1]})
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 400, {from: accounts[2]})
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 500, {from: accounts[3]})

        //Create market order that should fill 2/3 orders in the book
        await my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 10);

        orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should only have 1 order left");
        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");

    })

    //Market orders should be filled until the order book is empty or the market order is 100% filled
    it ("Market orders should be filled until the order book is empty", async () => {
        let my_dex = await DEX.deployed()

        let orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should have 1 order left");

        //Fill up the sell order book again
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 400, {from: accounts[1]})
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 500, {from: accounts[2]})

        //check buyer some_token balance before some_token purchase
        let balanceBefore = await my_dex.balances(accounts[0], web3.utils.fromUtf8("SSAT"))

        //Create market order that could fill more than the entire order book (15 some_token)
        await my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 50);

        //check buyer some_token balance after some_token purchase
        let balanceAfter = await my_dex.balances(accounts[0], web3.utils.fromUtf8("SSAT"))

        //Buyer should have 15 more some_token after, even though order was for 50. 
        assert.equal(balanceBefore.toNumber() + 15, balanceAfter.toNumber());
    })

    //The eth balance of the buyer should decrease with the filled amount
    it ("The eth balance of the buyer should decrease with the filled amount", async () => {
        let my_dex = await DEX.deployed()
        let some_token = await SomeToken.deployed()

        //Seller deposits some_token and creates a sell limit order for 1 some_token for 300 wei
        await some_token.approve(my_dex.address, 500, {from: accounts[1]});
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 1, 300, {from: accounts[1]})

        //Check buyer ETH balance before trade
        let balanceBefore = await my_dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        await my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 1);
        let balanceAfter = await my_dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore.toNumber() - 300, balanceAfter.toNumber());
    })

    //The token balances of the limit order sellers should decrease with the filled amounts.
    it ("The token balances of the limit order sellers should decrease with the filled amounts.", async () => {
        let my_dex = await DEX.deployed()
        let some_token = await SomeToken.deployed()

        let orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        //Seller Account[2] deposits some_token
        await some_token.approve(my_dex.address, 500, {from: accounts[2]});
        await my_dex.deposit(100, web3.utils.fromUtf8("SSAT"), {from: accounts[2]});

        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 1, 300, {from: accounts[1]})
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 1, 400, {from: accounts[2]})

        //Check sellers Link balances before trade
        let account1balanceBefore = await my_dex.balances(accounts[1], web3.utils.fromUtf8("SSAT"));
        let account2balanceBefore = await my_dex.balances(accounts[2], web3.utils.fromUtf8("SSAT"));

        //Account[0] created market order to buy up both sell orders
        await my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 2);

        //Check sellers Link balances after trade
        let account1balanceAfter = await my_dex.balances(accounts[1], web3.utils.fromUtf8("SSAT"));
        let account2balanceAfter = await my_dex.balances(accounts[2], web3.utils.fromUtf8("SSAT"));

        assert.equal(account1balanceBefore.toNumber() - 1, account1balanceAfter.toNumber());
        assert.equal(account2balanceBefore.toNumber() - 1, account2balanceAfter.toNumber());
    })

    //Filled limit orders should be removed from the orderbook
    it ("Filled limit orders should be removed from the orderbook", async () => {
        let my_dex = await DEX.deployed()
        let some_token = await SomeToken.deployed()
        await my_dex.addToken(web3.utils.fromUtf8("SSAT"), some_token.address)

        //Seller deposits some_token and creates a sell limit order for 1 some_token for 300 wei
        await some_token.approve(my_dex.address, 500);
        await my_dex.deposit(50, web3.utils.fromUtf8("SSAT"));
        
        await my_dex.depositEth({value: 10000});

        let orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook

        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 1, 300)
        await my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 1);

        orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty after trade");
    })

    //Partly filled limit orders should be modified to represent the filled/remaining amount
    it ("Limit orders filled property should be set correctly after a trade", async () => {
        let my_dex = await DEX.deployed()

        let orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 300, {from: accounts[1]})
        await my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 2);

        orderbook = await my_dex.getOrderBook(web3.utils.fromUtf8("SSAT"), 1); //Get sell side orderbook
        assert.equal(orderbook[0].filled, 2);
        assert.equal(orderbook[0].amount, 5);
    })

    //When creating a BUY market order, the buyer needs to have enough ETH for the trade
    it ("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let my_dex = await DEX.deployed()
        
        let balance = await my_dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
        await my_dex.createLimitOrder(1, web3.utils.fromUtf8("SSAT"), 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            my_dex.createMarketOrder(0, web3.utils.fromUtf8("SSAT"), 5, {from: accounts[4]})
        )
    })
})