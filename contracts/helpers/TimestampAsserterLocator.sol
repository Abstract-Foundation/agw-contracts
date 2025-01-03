// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ITimestampAsserter.sol";

library TimestampAsserterLocator {
  function locate() internal view returns (ITimestampAsserter) {
    if (block.chainid == 260) {
      return ITimestampAsserter(address(0x00000000000000000000000000000000808012));
    }
    else {
      return ITimestampAsserter(address(0x958F70e4Fd676c9CeAaFe5c48cB78CDD08b4880d));
    }
  }
}