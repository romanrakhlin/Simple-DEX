pragma solidity >=0.4.22 <0.9.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts//utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts//access/Ownable.sol";

contract Wallet is Ownable {

	// check that the Token struct for that symbol is exists not 0x00000000
	modifier tokenExists(bytes32 symbol) {
		require(tokenMapping[symbol].tokenAddress != address(0), "Token doesn't exist!");
		_;
	}

	// it's always safer to use SafeMath!!
	using SafeMath for uint256;

	// the typical ERC20 tokens has those things
	struct Token {
		bytes32 symbol;
		address tokenAddress;
	}

	mapping(bytes32 => Token) public tokenMapping; // info about the tokens
	bytes32[] public tokenList; // all tokens has we have (ever interacted)

	// each address has specific token (bytes32 is a code of token) => the amount of that token
	mapping(address => mapping(bytes32 => uint256)) public balances;

	function addToken(bytes32 symbol, address tokenAddress) onlyOwner external {
		tokenMapping[symbol] = Token(symbol, tokenAddress);
		tokenList.push(symbol);
	}

	function deposit(uint amount, bytes32 symbol) tokenExists(symbol) external {
		IERC20(tokenMapping[symbol].tokenAddress).transferFrom(msg.sender, address(this), amount);
		balances[msg.sender][symbol] = balances[msg.sender][symbol].add(amount);
	}

	function withdraw(uint amount, bytes32 symbol) tokenExists(symbol) external {
		require(balances[msg.sender][symbol] >= amount, "Not enough funds for withdraw"); //balance more than withdwar

		balances[msg.sender][symbol] = balances[msg.sender][symbol].sub(amount); // Safe Subtraction
		IERC20(tokenMapping[symbol].tokenAddress).transfer(msg.sender, amount);
	}

	//deposit ETH
	function depositEth() payable external {
		require(msg.value != 0, "cannot deposit nothing");
		balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(msg.value);
	}

	//withdraw ETH
	function withdrawEth(uint amount) external {
		require(balances[msg.sender][bytes32("ETH")] >= amount,'Insuffient balance'); 
		balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].sub(amount);
	}
}