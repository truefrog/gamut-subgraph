import { ZERO_BD, ZERO_BI, ONE_BI, ADDRESS_ZERO } from './constants'
/* eslint-disable prefer-const */
import {
  GamutDayData,
  Factory,
  Pool,
  PoolDayData,
  Token,
  TokenDayData,
  TokenHourData,
  Bundle,
  PoolHourData
} from '../../generated/schema'
import { FACTORY_ADDRESS } from './constants'
import { ethereum, Address, log } from '@graphprotocol/graph-ts'
import { Swap as SwapEvent } from '../../generated/Router/Router'

/**
 * Tracks global aggregate data over daily windows
 * @param event
 */
export function updateGamutDayDataFromEvent(transaction: ethereum.Transaction, block: ethereum.Block): GamutDayData {
  let gamut = Factory.load(FACTORY_ADDRESS)
  let timestamp = block.timestamp.toI32()
  let dayID = timestamp / 86400 // rounded
  let dayStartTimestamp = dayID * 86400
  let gamutDayData = GamutDayData.load(dayID.toString())
  if (gamutDayData === null) {
    gamutDayData = new GamutDayData(dayID.toString())
    gamutDayData.date = dayStartTimestamp
    gamutDayData.volumeETH = ZERO_BD
    gamutDayData.volumeUSD = ZERO_BD
    gamutDayData.volumeUSDUntracked = ZERO_BD
    gamutDayData.feesUSD = ZERO_BD
  }

  if (gamut === null) {
    log.error('gamut is not existed', [])
    return gamutDayData as GamutDayData
  }

  gamutDayData.tvlUSD = gamut.totalValueLockedUSD
  gamutDayData.txCount = gamut.txCount
  gamutDayData.save()
  return gamutDayData as GamutDayData
}

export function updatePoolDayDataFromEvent(poolAddress: Address, transaction: ethereum.Transaction, block: ethereum.Block): PoolDayData {
  let timestamp = block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPoolID = poolAddress
    .toHexString()
    .concat('-')
    .concat(dayID.toString())
  let pool = Pool.load(poolAddress.toHexString())
  let poolDayData = PoolDayData.load(dayPoolID)
  if (poolDayData === null) {
    poolDayData = new PoolDayData(dayPoolID)
    poolDayData.date = dayStartTimestamp
    poolDayData.pool = ADDRESS_ZERO
    // things that dont get initialized always
    poolDayData.volumeToken0 = ZERO_BD
    poolDayData.volumeToken1 = ZERO_BD
    poolDayData.volumeUSD = ZERO_BD
    poolDayData.feesUSD = ZERO_BD
    poolDayData.txCount = ZERO_BI
    poolDayData.liquidity = ZERO_BI
    poolDayData.open = ZERO_BD
    poolDayData.high = ZERO_BD
    poolDayData.low = ZERO_BD
    poolDayData.close = ZERO_BD
    poolDayData.token0Price = ZERO_BD
    poolDayData.token1Price = ZERO_BD
    poolDayData.tvlUSD = ZERO_BD
    poolDayData.txCount = ZERO_BI

    if (pool === null) {
      log.error('pool is not existed', [])
      return poolDayData as PoolDayData
    }

    poolDayData.pool = pool.id
    poolDayData.open = pool.token0Price
    poolDayData.high = pool.token0Price
    poolDayData.low = pool.token0Price
    poolDayData.close = pool.token0Price
  }

  if (pool === null) {
    log.error('pool is not existed', [])
    return poolDayData as PoolDayData
  }

  if (pool.token0Price.gt(poolDayData.high)) {
    poolDayData.high = pool.token0Price
  }
  if (pool.token0Price.lt(poolDayData.low)) {
    poolDayData.low = pool.token0Price
  }

  poolDayData.token0Price = pool.token0Price
  poolDayData.token1Price = pool.token1Price
  poolDayData.close = pool.token0Price
  // log.info("---------------------------totalValueLockedUSD: {}", [pool.totalValueLockedUSD.toString()])
  poolDayData.tvlUSD = pool.totalValueLockedUSD
  poolDayData.txCount = poolDayData.txCount.plus(ONE_BI)
  poolDayData.save()

  return poolDayData as PoolDayData
}

export function updatePoolHourDataFromEvent(poolAddress: Address, transaction: ethereum.Transaction, block: ethereum.Block): PoolHourData {
  let timestamp = block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPoolID = poolAddress
    .toHexString()
    .concat('-')
    .concat(hourIndex.toString())
  let pool = Pool.load(poolAddress.toHexString())
  let poolHourData = PoolHourData.load(hourPoolID)
  if (poolHourData === null) {
    poolHourData = new PoolHourData(hourPoolID)
    poolHourData.periodStartUnix = hourStartUnix
    poolHourData.pool = ADDRESS_ZERO
    // things that dont get initialized always
    poolHourData.volumeToken0 = ZERO_BD
    poolHourData.volumeToken1 = ZERO_BD
    poolHourData.volumeUSD = ZERO_BD
    poolHourData.txCount = ZERO_BI
    poolHourData.feesUSD = ZERO_BD
    poolHourData.liquidity = ZERO_BI
    poolHourData.open = ZERO_BD
    poolHourData.high = ZERO_BD
    poolHourData.low = ZERO_BD
    poolHourData.close = ZERO_BD
    poolHourData.token0Price = ZERO_BD
    poolHourData.token1Price = ZERO_BD
    poolHourData.tvlUSD = ZERO_BD
    poolHourData.txCount = ZERO_BI

    if (pool === null) {
      log.error('pool is not existed', [])
      return poolHourData as PoolHourData
    }

    poolHourData.pool = pool.id
    poolHourData.open = pool.token0Price
    poolHourData.high = pool.token0Price
    poolHourData.low = pool.token0Price
    poolHourData.close = pool.token0Price
  }

  if (pool === null) {
    log.error('pool is not existed', [])
    return poolHourData as PoolHourData
  }

  if (pool.token0Price.gt(poolHourData.high)) {
    poolHourData.high = pool.token0Price
  }
  if (pool.token0Price.lt(poolHourData.low)) {
    poolHourData.low = pool.token0Price
  }

  poolHourData.token0Price = pool.token0Price
  poolHourData.token1Price = pool.token1Price
  poolHourData.close = pool.token0Price
  // log.info("---------------------------totalValueLockedUSD: {}", [pool.totalValueLockedUSD.toString()])
  poolHourData.tvlUSD = pool.totalValueLockedUSD
  poolHourData.txCount = poolHourData.txCount.plus(ONE_BI)
  poolHourData.save()

  // test
  return poolHourData as PoolHourData
}

export function updateTokenDayDataFromEvent(token: Token, transaction: ethereum.Transaction, block: ethereum.Block): TokenDayData {
  let bundle = Bundle.load('1')

  let timestamp = block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(dayID.toString())

  let tokenPrice = bundle === null ? ZERO_BD : token.derivedETH.times(bundle.ethPriceUSD)

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.volume = ZERO_BD
    tokenDayData.volumeUSD = ZERO_BD
    tokenDayData.feesUSD = ZERO_BD
    tokenDayData.untrackedVolumeUSD = ZERO_BD

    tokenDayData.open = tokenPrice
    tokenDayData.high = tokenPrice
    tokenDayData.low = tokenPrice
    tokenDayData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenDayData.high)) {
    tokenDayData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenDayData.low)) {
    tokenDayData.low = tokenPrice
  }

  tokenDayData.close = tokenPrice
  tokenDayData.priceUSD = bundle === null ? ZERO_BD : token.derivedETH.times(bundle.ethPriceUSD)
  tokenDayData.totalValueLocked = token.totalValueLocked
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenDayData.save()

  return tokenDayData as TokenDayData
}

export function updateTokenHourDataFromEvent(token: Token, transaction: ethereum.Transaction, block: ethereum.Block): TokenHourData {
  let bundle = Bundle.load('1')
  let timestamp = block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let tokenHourID = token.id
    .toString()
    .concat('-')
    .concat(hourIndex.toString())
  let tokenHourData = TokenHourData.load(tokenHourID)
  let tokenPrice = bundle === null ? ZERO_BD : token.derivedETH.times(bundle.ethPriceUSD)

  if (tokenHourData === null) {
    tokenHourData = new TokenHourData(tokenHourID)
    tokenHourData.periodStartUnix = hourStartUnix
    tokenHourData.token = token.id
    tokenHourData.volume = ZERO_BD
    tokenHourData.volumeUSD = ZERO_BD
    tokenHourData.untrackedVolumeUSD = ZERO_BD
    tokenHourData.feesUSD = ZERO_BD
    tokenHourData.open = tokenPrice
    tokenHourData.high = tokenPrice
    tokenHourData.low = tokenPrice
    tokenHourData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenHourData.high)) {
    tokenHourData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenHourData.low)) {
    tokenHourData.low = tokenPrice
  }

  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = tokenPrice
  tokenHourData.totalValueLocked = token.totalValueLocked
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenHourData.save()

  return tokenHourData as TokenHourData
}

export function updateGamutDayData(call: ethereum.Call): GamutDayData {
  let gamut = Factory.load(FACTORY_ADDRESS)
  let timestamp = call.block.timestamp.toI32()
  let dayID = timestamp / 86400 // rounded
  let dayStartTimestamp = dayID * 86400
  let gamutDayData = GamutDayData.load(dayID.toString())
  if (gamutDayData === null) {
    gamutDayData = new GamutDayData(dayID.toString())
    gamutDayData.date = dayStartTimestamp
    gamutDayData.volumeETH = ZERO_BD
    gamutDayData.volumeUSD = ZERO_BD
    gamutDayData.volumeUSDUntracked = ZERO_BD
    gamutDayData.feesUSD = ZERO_BD
    gamutDayData.tvlUSD = ZERO_BD
    gamutDayData.txCount = ZERO_BI
  }

  if (gamut === null) {
    log.error('gamut is not existed', [])
    return gamutDayData as GamutDayData
  }

  gamutDayData.tvlUSD = gamut.totalValueLockedUSD
  gamutDayData.txCount = gamut.txCount
  gamutDayData.save()
  return gamutDayData as GamutDayData
}

export function updatePoolDayData(call: ethereum.Call): PoolDayData {
  let timestamp = call.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPoolID = call.from
    .toHexString()
    .concat('-')
    .concat(dayID.toString())
  let pool = Pool.load(call.from.toHexString())
  let poolDayData = PoolDayData.load(dayPoolID)
  if (poolDayData === null) {
    poolDayData = new PoolDayData(dayPoolID)
    poolDayData.date = dayStartTimestamp
    poolDayData.pool = ADDRESS_ZERO
    // things that dont get initialized always
    poolDayData.volumeToken0 = ZERO_BD
    poolDayData.volumeToken1 = ZERO_BD
    poolDayData.volumeUSD = ZERO_BD
    poolDayData.feesUSD = ZERO_BD
    poolDayData.txCount = ZERO_BI
    poolDayData.open = ZERO_BD
    poolDayData.high = ZERO_BD
    poolDayData.low = ZERO_BD
    poolDayData.close = ZERO_BD
    poolDayData.token0Price = ZERO_BD
    poolDayData.token1Price = ZERO_BD
    poolDayData.tvlUSD = ZERO_BD
    poolDayData.txCount = ZERO_BI

    if (pool === null) {
      log.error('pool is not existed', [])
      return poolDayData as PoolDayData
    }

    poolDayData.pool = pool.id
    poolDayData.open = pool.token0Price
    poolDayData.high = pool.token0Price
    poolDayData.low = pool.token0Price
    poolDayData.close = pool.token0Price
  }

  if (pool === null) {
    log.error('pool is not existed', [])
    return poolDayData as PoolDayData
  }

  if (pool.token0Price.gt(poolDayData.high)) {
    poolDayData.high = pool.token0Price
  }
  if (pool.token0Price.lt(poolDayData.low)) {
    poolDayData.low = pool.token0Price
  }

  poolDayData.close = pool.token0Price
  poolDayData.token0Price = pool.token0Price
  poolDayData.token1Price = pool.token1Price
  poolDayData.tvlUSD = pool.totalValueLockedUSD
  poolDayData.txCount = poolDayData.txCount.plus(ONE_BI)
  poolDayData.save()

  return poolDayData as PoolDayData
}

export function updatePoolHourData(call: ethereum.Call): PoolHourData {
  let timestamp = call.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPoolID = call.from
    .toHexString()
    .concat('-')
    .concat(hourIndex.toString())
  let pool = Pool.load(call.from.toHexString())
  let poolHourData = PoolHourData.load(hourPoolID)
  if (poolHourData === null) {
    poolHourData = new PoolHourData(hourPoolID)
    poolHourData.periodStartUnix = hourStartUnix
    poolHourData.pool = pool.id
    // things that dont get initialized always
    poolHourData.volumeToken0 = ZERO_BD
    poolHourData.volumeToken1 = ZERO_BD
    poolHourData.volumeUSD = ZERO_BD
    poolHourData.txCount = ZERO_BI
    poolHourData.feesUSD = ZERO_BD
    poolHourData.open = ZERO_BD
    poolHourData.high = ZERO_BD
    poolHourData.low = ZERO_BD
    poolHourData.close = ZERO_BD
    poolHourData.token0Price = ZERO_BD
    poolHourData.token1Price = ZERO_BD
    poolHourData.tvlUSD = ZERO_BD
    poolHourData.txCount = ZERO_BI

    if (pool === null) {
      log.error('pool is not existed', [])
      return poolHourData as PoolHourData
    }

    poolHourData.pool = pool.id
    poolHourData.open = pool.token0Price
    poolHourData.high = pool.token0Price
    poolHourData.low = pool.token0Price
    poolHourData.close = pool.token0Price
  }

  if (pool === null) {
    log.error('pool is not existed', [])
    return poolHourData as PoolHourData
  }

  if (pool.token0Price.gt(poolHourData.high)) {
    poolHourData.high = pool.token0Price
  }
  if (pool.token0Price.lt(poolHourData.low)) {
    poolHourData.low = pool.token0Price
  }


  poolHourData.close = pool.token0Price
  poolHourData.token0Price = pool.token0Price
  poolHourData.token1Price = pool.token1Price
  poolHourData.tvlUSD = pool.totalValueLockedUSD
  poolHourData.txCount = poolHourData.txCount.plus(ONE_BI)
  poolHourData.save()

  // test
  return poolHourData as PoolHourData
}

export function updateTokenDayData(token: Token, call: ethereum.Call): TokenDayData {
  let bundle = Bundle.load('1')
  let timestamp = call.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(dayID.toString())
  let tokenPrice = bundle === null ? ZERO_BD : token.derivedETH.times(bundle.ethPriceUSD)

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.volume = ZERO_BD
    tokenDayData.volumeUSD = ZERO_BD
    tokenDayData.feesUSD = ZERO_BD
    tokenDayData.untrackedVolumeUSD = ZERO_BD
    tokenDayData.open = tokenPrice
    tokenDayData.high = tokenPrice
    tokenDayData.low = tokenPrice
    tokenDayData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenDayData.high)) {
    tokenDayData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenDayData.low)) {
    tokenDayData.low = tokenPrice
  }

  tokenDayData.close = tokenPrice
  tokenDayData.priceUSD = bundle === null ? ZERO_BD : token.derivedETH.times(bundle.ethPriceUSD)
  tokenDayData.totalValueLocked = token.totalValueLocked
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenDayData.save()

  return tokenDayData as TokenDayData
}

export function updateTokenHourData(token: Token, call: ethereum.Call): TokenHourData {
  let bundle = Bundle.load('1')
  let timestamp = call.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let tokenHourID = token.id
    .toString()
    .concat('-')
    .concat(hourIndex.toString())
  let tokenHourData = TokenHourData.load(tokenHourID)
  let tokenPrice = bundle === null ? ZERO_BD : token.derivedETH.times(bundle.ethPriceUSD)

  if (tokenHourData === null) {
    tokenHourData = new TokenHourData(tokenHourID)
    tokenHourData.periodStartUnix = hourStartUnix
    tokenHourData.token = token.id
    tokenHourData.volume = ZERO_BD
    tokenHourData.volumeUSD = ZERO_BD
    tokenHourData.untrackedVolumeUSD = ZERO_BD
    tokenHourData.feesUSD = ZERO_BD
    tokenHourData.open = tokenPrice
    tokenHourData.high = tokenPrice
    tokenHourData.low = tokenPrice
    tokenHourData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenHourData.high)) {
    tokenHourData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenHourData.low)) {
    tokenHourData.low = tokenPrice
  }

  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = tokenPrice
  tokenHourData.totalValueLocked = token.totalValueLocked
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenHourData.save()

  return tokenHourData as TokenHourData
}
