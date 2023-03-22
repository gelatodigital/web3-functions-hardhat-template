// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@redstone-finance/evm-connector/contracts/data-services/RapidDemoConsumerBase.sol";

contract RedstoneOracle is RapidDemoConsumerBase {
    uint8 private immutable _decimals = 8;
    uint256 private _price = 0;

    function decimals() external pure returns (uint8) {
        return _decimals;
    }

    function getStoredPrice() external view returns (uint256) {
        return _price;
    }

    /**
     * Use storage-less approach to query in memory price
     * See: https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/evm-connector#storage-less-approach
     *
     * @return uint256 price.
     */
    function getLivePrice() public view returns (uint256) {
        // Extract and verify price using redstone connector
        return getOracleNumericValueFromTxMsg(bytes32("ETH"));
    }

    function _computeDeviation(
        uint256 newPrice,
        uint256 oldPrice
    ) internal pure returns (uint) {
        if (oldPrice == 0) {
            return 1;
        } else if (newPrice > oldPrice) {
            return ((newPrice - oldPrice) * 10 ** _decimals) / oldPrice;
        } else {
            return ((oldPrice - newPrice) * 10 ** _decimals) / oldPrice;
        }
    }

    function getPriceDeviation() external view returns (uint) {
        return _computeDeviation(getLivePrice(), _price);
    }

    function updatePrice() public {
        _price = getLivePrice();
    }
}
