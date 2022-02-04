pragma solidity >=0.4.22 <0.9.0;
pragma experimental ABIEncoderV2;

import "./Wallet.sol";

contract DEX is Wallet {

	// it's always safer to use SafeMath!!
	using SafeMath for uint256;

	enum TypeOfOrder {
		Buy, 
		Sell
	}

	struct Order {
		uint id;
		address trader;
		TypeOfOrder typeOfOrder;
		bytes32 symbol;
		uint amount;
		uint price;
		uint filled;
	}

	uint public nextOrderId = 0;

	mapping(bytes32 => mapping(uint => Order[])) public orderBook;

	function getOrderBook(bytes32 symbol, TypeOfOrder typeOfOrder) view public returns(Order[] memory) {
		return orderBook[symbol][uint(typeOfOrder)];
	}

	function createLimitOrder(TypeOfOrder typeOfOrder, bytes32 symbol, uint amount, uint price) public {
		if (typeOfOrder == TypeOfOrder.Buy) {
			require(balances[msg.sender]["ETH"] >= amount.mul(price), "ETH balance must be greater than or equal to buy order value!");
		} else if(typeOfOrder == TypeOfOrder.Sell){
			require(balances[msg.sender][symbol] >= amount, "Token balance must be greater than or equal to sell order value!");
		}

		Order[] storage orders = orderBook[symbol][uint(typeOfOrder)];
		orders.push(Order(nextOrderId, msg.sender, typeOfOrder, symbol, amount, price, 0));

		//Bubble sort
		uint i = orders.length > 0 ? orders.length - 1 : 0;

		if (typeOfOrder == TypeOfOrder.Buy) { // normal sort
			while (i > 0) {
				if (orders[i - 1].price > orders[i].price) {
					break;
				}
				Order memory orderToMove = orders[i - 1];
				orders[i - 1] = orders[i];
				orders[i] = orderToMove;
				i--;
			}
		} else if (typeOfOrder == TypeOfOrder.Sell) { // reversed sort
			while (i > 0) {
				if (orders[i - 1].price < orders[i].price) {
					break;
				}
				Order memory orderToMove = orders[i - 1];
				orders[i - 1] = orders[i];
				orders[i] = orderToMove;
				i--;
			}
		}

		nextOrderId++;
	}

	function createMarketOrder(TypeOfOrder typeOfOrder, bytes32 symbol, uint amount) public {
		if (typeOfOrder == TypeOfOrder.Sell) {
			require(balances[msg.sender][symbol] >= amount, "Insuffient balance");
		}

		uint orderBookSide;
		if (typeOfOrder == TypeOfOrder.Buy) {
			orderBookSide = 1;
		} else {
			orderBookSide = 0;
		}
		Order[] storage orders = orderBook[symbol][orderBookSide];

		uint totalFilled = 0;

		for (uint256 i = 0; i < orders.length && totalFilled < amount; i++) {
			uint leftToFill = amount.sub(totalFilled);
			uint availableToFill = orders[i].amount.sub(orders[i].filled);
			uint filled = 0;
			if (availableToFill > leftToFill) { 
				filled = leftToFill; //Fill the entire market order
			} else {
				filled = availableToFill; //Fill as much as is available in order[i]
			}

			totalFilled = totalFilled.add(filled);
			orders[i].filled = orders[i].filled.add(filled);
			uint cost = filled.mul(orders[i].price);

			if (typeOfOrder == TypeOfOrder.Buy) {
				//Verify that the buyer has enough ETH to cover the purchase (require)
				require(balances[msg.sender]["ETH"] >= cost);

				//msg.sender is the buyer
				balances[msg.sender][symbol] = balances[msg.sender][symbol].add(filled);
				balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);

				balances[orders[i].trader][symbol] = balances[orders[i].trader][symbol].sub(filled);
				balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"].add(cost);
			} else if (typeOfOrder == TypeOfOrder.Sell) {
				//Msg.sender is the seller
				balances[msg.sender][symbol] = balances[msg.sender][symbol].sub(filled);
				balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);

				balances[orders[i].trader][symbol] = balances[orders[i].trader][symbol].add(filled);
				balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"].sub(cost);
			}
		}

		//Remove 100% filled orders from the orderbook
		while(orders.length > 0 && orders[0].filled == orders[0].amount){
			//Remove the top element in the orders array by overwriting every element
			// with the next element in the order list
			for (uint256 i = 0; i < orders.length - 1; i++) {
				orders[i] = orders[i + 1];
			}
			orders.pop();
		}
	}
}