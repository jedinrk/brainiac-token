// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interface/IERC20.sol";
import "./interface/OwnableUpgradeSafe.sol";
import "./interface/LGEWhitelisted.sol";
import "./interface/Address.sol";
import "./interface/IUniswapV2Router02.sol";
import "./interface/IUniswapV2Factory.sol";
import "./interface/Pausable.sol";

contract Brainiac is IERC20, OwnableUpgradeSafe, LGEWhitelisted, Pausable{
    
    using SafeMath for uint256;
    using Address for address;

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;
    
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    uint256 private _totalSupply;

    mapping(address => bool) public _feeExcluded;

	uint256 public _feeRewardPct;
	uint256 public _limitPct;
	
	address public _feeRewardAddress;

	mapping(address => bool) public _pair;
	
	address public _router;
	
	address[] public _feeRewardSwapPath;
    
    function initialize(uint256 buyLimit, uint256 feeRewardPct, address feeRewardAddress, address router)
        public
        initializer
    {
        
        _name = "BrainiacChess";
        _symbol = "BRAINIAC";
        _decimals = 18;
        
        _limitPct = buyLimit;
        
        __Ownable_init();
		__LGEWhitelisted_init();
		
		_router = router;
		
		address[] memory feeRewardSwapPath;
		
		if(_router != address(0)) {
		
    		IUniswapV2Router02 r = IUniswapV2Router02(router);
    		IUniswapV2Factory f = IUniswapV2Factory(r.factory());
    		
            setPair(f.createPair(address(this), r.WETH()), true);
            
            feeRewardSwapPath = new address[](2);
                
            feeRewardSwapPath[0] = address(this);
            feeRewardSwapPath[1] = r.WETH();
        
		}
		
		setFees(feeRewardPct, feeRewardSwapPath, feeRewardAddress);
		
		setFeeExcluded(_msgSender(), true);
		setFeeExcluded(address(this), true);

        _mint(_msgSender(), 300000000 * 10 ** decimals());
    }
    
    function setRouter(address r) public onlyOwner {
        _router = r;
    }
    
    function setFees(uint256 feeRewardPct, address[] memory feeRewardSwapPath, address feeRewardAddress) public onlyOwner {
        require(feeRewardSwapPath.length != 1, "Invalid path");
		require(feeRewardAddress != address(0), "Fee reward address must not be zero address");
		
		_feeRewardPct = feeRewardPct;
		_feeRewardSwapPath = feeRewardSwapPath;
		_feeRewardAddress = feeRewardAddress;
		
    }

	function setPair(address a, bool pair) public onlyOwner {
        _pair[a] = pair;
    }

	function setFeeExcluded(address a, bool excluded) public onlyOwner {
        _feeExcluded[a] = excluded;
    }

    function setBuyLimit(uint256 limitPct) public onlyOwner {
        _limitPct = limitPct;
    }
    
    
    function _beforeTokenTransfer(address sender, address recipient, uint256 amount) internal {
        
		LGEWhitelisted._applyLGEWhitelist(sender, recipient, amount);
		
        // Standard DEX transfers with fee
        require(amount <= _totalSupply.mul(_limitPct).div(10000), "Out of limit per transaction");

    }
	
	function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
		
        _beforeTokenTransfer(sender, recipient, amount);
		
		_balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
		
		if(_pair[recipient] && !_feeExcluded[sender]) {
						
			uint256 feeRewardAmount = 0;
			
			if(_feeRewardPct > 0 && _feeRewardAddress != address(0))  {
			    
				feeRewardAmount = amount.mul(_feeRewardPct).div(10000);
				
				if(_router != address(0)) {
				    
    				_balances[address(this)] = _balances[address(this)].add(feeRewardAmount);
    				
    				emit Transfer(sender, address(this), feeRewardAmount);
    				
    				IUniswapV2Router02 r = IUniswapV2Router02(_router);
                    
                    _approve(address(this), _router, feeRewardAmount);
    
                    r.swapExactTokensForETHSupportingFeeOnTransferTokens(
                        feeRewardAmount,
                        0,
                        _feeRewardSwapPath,
                        _feeRewardAddress,
                        block.timestamp
                    );
                
				} else {
				    _balances[_feeRewardAddress] = _balances[_feeRewardAddress].add(feeRewardAmount);
				    emit Transfer(sender, _feeRewardAddress, feeRewardAmount);
				}
				
			}
			
			amount = amount.sub(feeRewardAmount);
			
		}

        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
	
	
    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }
    
    function limit() public view returns (uint256) {
        return _limitPct;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public whenNotPaused virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);

        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
	
}