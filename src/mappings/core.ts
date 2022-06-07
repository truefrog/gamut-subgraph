/* eslint-disable prefer-const */
import { Bundle, Factory, Pool, Swap, Join, Exit, Token } from '../../generated/schema'
import { Pool as PoolABI, SwapFeePercentageChanged } from '../../generated/Factory/Pool'
import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import {
  SwapFeePercentageChanged as SwapFeeEvent,
  OnSwapCall as SwapCall,
  OnJoinPoolCall as JoinPoolCall,
  OnExitPoolCall as ExitPoolCall
} from '../../generated/templates/Pool/Pool'
import { convertTokenToDecimal, loadTransaction, safeDiv } from '../utils'
import { FACTORY_ADDRESS, ONE_BI, ZERO_BD } from '../utils/constants'
import { findEthPerToken, getEthPriceInUSD, getTrackedAmountUSD, getTokenPrices } from '../utils/pricing'
import {
  updatePoolDayData,
  updatePoolHourData,
  updateTokenDayData,
  updateTokenHourData,
  updateGamutDayData
} from '../utils/intervalUpdates'
import { log } from '@graphprotocol/graph-ts'

export function handleSwapFee(event: SwapFeeEvent): void {
  let poolAddress = event.address.toHexString()
  let pool = Pool.load(poolAddress)
  if (pool === null) {
    log.error('pool is not existed', [])
    return
  }
  pool.feeTier = event.params.swapFeePercentage
  pool.save()
}

// export function handleSwap(call: SwapCall): void {
//   let bundle = Bundle.load('1')
//   let factory = Factory.load(FACTORY_ADDRESS)
//   // let factoryContract = FactoryABI.bind(Address.fromString(FACTORY_ADDRESS))
//   // let poolAddress = factoryContract.getPool(call.inputs.tokenIn, call.from)
//   let poolAddress = call.to.toHexString()
//   let pool = Pool.load(poolAddress)
//   let poolContract = PoolABI.bind(Address.fromString(poolAddress))
//   let weights = poolContract.getWeights()
//   pool.weight0 = weights[0].toBigDecimal();
//   pool.weight1 = weights[0].toBigDecimal();
//   let token0 = Token.load(pool.token0)
//   let token1 = Token.load(pool.token1)

//   // amounts - 0/1 are token deltas: can be positive or negative
//   let amount0 = convertTokenToDecimal(call.inputs.amountIn)
//   let amount1 = convertTokenToDecimal(call.outputs.value0)

//   // need absolute amounts for volume
//   let amount0Abs = amount0
//   if (amount0.lt(ZERO_BD)) {
//     amount0Abs = amount0.times(BigDecimal.fromString('-1'))
//   }
//   let amount1Abs = amount1
//   if (amount1.lt(ZERO_BD)) {
//     amount1Abs = amount1.times(BigDecimal.fromString('-1'))
//   }

//   let amount0ETH = amount0Abs.times(token0.derivedETH)
//   let amount1ETH = amount1Abs.times(token1.derivedETH)
//   let amount0USD = amount0ETH.times(bundle.ethPriceUSD)
//   let amount1USD = amount1ETH.times(bundle.ethPriceUSD)

//   // get amount that should be tracked only - div 2 because cant count both input and output as volume
//   let amountTotalUSDTracked = getTrackedAmountUSD(amount0Abs, token0 as Token, amount1Abs, token1 as Token).div(
//     BigDecimal.fromString('2')
//   )
//   let amountTotalETHTracked = safeDiv(amountTotalUSDTracked, bundle.ethPriceUSD)
//   let amountTotalUSDUntracked = amount0USD.plus(amount1USD).div(BigDecimal.fromString('2'))

//   let feesETH = amountTotalETHTracked.times(pool.feeTier.toBigDecimal()).div(BigDecimal.fromString('100000000000000000'))
//   let feesUSD = amountTotalUSDTracked.times(pool.feeTier.toBigDecimal()).div(BigDecimal.fromString('100000000000000000'))

//   // global updates
//   factory.txCount = factory.txCount.plus(ONE_BI)
//   factory.totalVolumeETH = factory.totalVolumeETH.plus(amountTotalETHTracked)
//   factory.totalVolumeUSD = factory.totalVolumeUSD.plus(amountTotalUSDTracked)
//   factory.untrackedVolumeUSD = factory.untrackedVolumeUSD.plus(amountTotalUSDUntracked)
//   factory.totalFeesETH = factory.totalFeesETH.plus(feesETH)
//   factory.totalFeesUSD = factory.totalFeesUSD.plus(feesUSD)

//   // reset aggregate tvl before individual pool tvl updates
//   let currentPoolTvlETH = pool.totalValueLockedETH
//   factory.totalValueLockedETH = factory.totalValueLockedETH.minus(currentPoolTvlETH)

//   // pool volume
//   pool.volumeToken0 = pool.volumeToken0.plus(amount0Abs)
//   pool.volumeToken1 = pool.volumeToken1.plus(amount1Abs)
//   pool.volumeUSD = pool.volumeUSD.plus(amountTotalUSDTracked)
//   pool.untrackedVolumeUSD = pool.untrackedVolumeUSD.plus(amountTotalUSDUntracked)
//   pool.feesUSD = pool.feesUSD.plus(feesUSD)
//   pool.txCount = pool.txCount.plus(ONE_BI)

//   // Update the pool.
//   pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
//   pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)

//   // update token0 data
//   token0.volume = token0.volume.plus(amount0Abs)
//   token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
//   token0.volumeUSD = token0.volumeUSD.plus(amountTotalUSDTracked)
//   token0.untrackedVolumeUSD = token0.untrackedVolumeUSD.plus(amountTotalUSDUntracked)
//   token0.feesUSD = token0.feesUSD.plus(feesUSD)
//   token0.txCount = token0.txCount.plus(ONE_BI)

//   // update token1 data
//   token1.volume = token1.volume.plus(amount1Abs)
//   token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
//   token1.volumeUSD = token1.volumeUSD.plus(amountTotalUSDTracked)
//   token1.untrackedVolumeUSD = token1.untrackedVolumeUSD.plus(amountTotalUSDUntracked)
//   token1.feesUSD = token1.feesUSD.plus(feesUSD)
//   token1.txCount = token1.txCount.plus(ONE_BI)

//   // updated pool ratess
//   let prices = getTokenPrices(Address.fromString(pool.id), token0 as Token, token1 as Token)
//   pool.token0Price = prices[0]
//   pool.token1Price = prices[1]
//   pool.save()

//   // update USD pricing
//   bundle.ethPriceUSD = getEthPriceInUSD()
//   bundle.save()
//   token0.derivedETH = findEthPerToken(token0 as Token)
//   token1.derivedETH = findEthPerToken(token1 as Token)

//   /**
//    * Things afffected by new USD rates
//    */
//   pool.totalValueLockedETH = pool.totalValueLockedToken0
//     .times(token0.derivedETH)
//     .plus(pool.totalValueLockedToken1.times(token1.derivedETH))
//   pool.totalValueLockedUSD = pool.totalValueLockedETH.times(bundle.ethPriceUSD)

//   factory.totalValueLockedETH = factory.totalValueLockedETH.plus(pool.totalValueLockedETH)
//   factory.totalValueLockedUSD = factory.totalValueLockedETH.times(bundle.ethPriceUSD)

//   token0.totalValueLockedUSD = token0.totalValueLocked.times(token0.derivedETH).times(bundle.ethPriceUSD)
//   token1.totalValueLockedUSD = token1.totalValueLocked.times(token1.derivedETH).times(bundle.ethPriceUSD)

//   // create Swap call
//   let transaction = loadTransaction(call)
//   let swap = new Swap(transaction.id + '#' + pool.txCount.toString())
//   swap.transaction = transaction.id
//   swap.timestamp = transaction.timestamp
//   swap.pool = pool.id
//   swap.token0 = pool.token0
//   swap.token1 = pool.token1
//   swap.amount0 = amount0
//   swap.amount1 = amount1
//   swap.amountUSD = amountTotalUSDTracked

//   // interval data
//   let gamutDayData = updateGamutDayData(call)
//   let poolDayData = updatePoolDayData(call)
//   let poolHourData = updatePoolHourData(call)
//   let token0DayData = updateTokenDayData(token0 as Token, call)
//   let token1DayData = updateTokenDayData(token1 as Token, call)
//   let token0HourData = updateTokenHourData(token0 as Token, call)
//   let token1HourData = updateTokenHourData(token1 as Token, call)

//   // update volume metrics
//   gamutDayData.volumeETH = gamutDayData.volumeETH.plus(amountTotalETHTracked)
//   gamutDayData.volumeUSD = gamutDayData.volumeUSD.plus(amountTotalUSDTracked)
//   gamutDayData.feesUSD = gamutDayData.feesUSD.plus(feesUSD)

//   poolDayData.volumeUSD = poolDayData.volumeUSD.plus(amountTotalUSDTracked)
//   poolDayData.volumeToken0 = poolDayData.volumeToken0.plus(amount0Abs)
//   poolDayData.volumeToken1 = poolDayData.volumeToken1.plus(amount1Abs)
//   poolDayData.feesUSD = poolDayData.feesUSD.plus(feesUSD)

//   poolHourData.volumeUSD = poolHourData.volumeUSD.plus(amountTotalUSDTracked)
//   poolHourData.volumeToken0 = poolHourData.volumeToken0.plus(amount0Abs)
//   poolHourData.volumeToken1 = poolHourData.volumeToken1.plus(amount1Abs)
//   poolHourData.feesUSD = poolHourData.feesUSD.plus(feesUSD)

//   token0DayData.volume = token0DayData.volume.plus(amount0Abs)
//   token0DayData.volumeUSD = token0DayData.volumeUSD.plus(amountTotalUSDTracked)
//   token0DayData.untrackedVolumeUSD = token0DayData.untrackedVolumeUSD.plus(amountTotalUSDTracked)
//   token0DayData.feesUSD = token0DayData.feesUSD.plus(feesUSD)

//   token0HourData.volume = token0HourData.volume.plus(amount0Abs)
//   token0HourData.volumeUSD = token0HourData.volumeUSD.plus(amountTotalUSDTracked)
//   token0HourData.untrackedVolumeUSD = token0HourData.untrackedVolumeUSD.plus(amountTotalUSDTracked)
//   token0HourData.feesUSD = token0HourData.feesUSD.plus(feesUSD)

//   token1DayData.volume = token1DayData.volume.plus(amount1Abs)
//   token1DayData.volumeUSD = token1DayData.volumeUSD.plus(amountTotalUSDTracked)
//   token1DayData.untrackedVolumeUSD = token1DayData.untrackedVolumeUSD.plus(amountTotalUSDTracked)
//   token1DayData.feesUSD = token1DayData.feesUSD.plus(feesUSD)

//   token1HourData.volume = token1HourData.volume.plus(amount1Abs)
//   token1HourData.volumeUSD = token1HourData.volumeUSD.plus(amountTotalUSDTracked)
//   token1HourData.untrackedVolumeUSD = token1HourData.untrackedVolumeUSD.plus(amountTotalUSDTracked)
//   token1HourData.feesUSD = token1HourData.feesUSD.plus(feesUSD)

//   swap.save()
//   token0DayData.save()
//   token1DayData.save()
//   gamutDayData.save()
//   poolDayData.save()
//   factory.save()
//   pool.save()
//   token0.save()
//   token1.save()
// }

// export function handleJoinPool(call: JoinPoolCall): void {
//   let bundle = Bundle.load('1')
//   let poolAddress = call.from.toHexString()
//   let pool = Pool.load(poolAddress)
//   let factory = Factory.load(FACTORY_ADDRESS)

//   let token0 = Token.load(pool.token0)
//   let token1 = Token.load(pool.token1)
//   let amount0 = convertTokenToDecimal(call.inputValues[2].value.toBigIntArray()[0])
//   let amount1 = convertTokenToDecimal(call.inputValues[2].value.toBigIntArray()[1])

//   let amountUSD = amount0
//     .times(token0.derivedETH.times(bundle.ethPriceUSD))
//     .plus(amount1.times(token1.derivedETH.times(bundle.ethPriceUSD)))

//   // reset tvl aggregates until new amounts calculated
//   factory.totalValueLockedETH = factory.totalValueLockedETH.minus(pool.totalValueLockedETH)

//   // update globals
//   factory.txCount = factory.txCount.plus(ONE_BI)

//   // update token0 data
//   token0.txCount = token0.txCount.plus(ONE_BI)
//   token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
//   token0.totalValueLockedUSD = token0.totalValueLocked.times(token0.derivedETH.times(bundle.ethPriceUSD))

//   // update token1 data
//   token1.txCount = token1.txCount.plus(ONE_BI)
//   token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
//   token1.totalValueLockedUSD = token1.totalValueLocked.times(token1.derivedETH.times(bundle.ethPriceUSD))

//   // pool data
//   pool.txCount = pool.txCount.plus(ONE_BI)

//   pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
//   pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)
//   pool.totalValueLockedETH = pool.totalValueLockedToken0
//     .times(token0.derivedETH)
//     .plus(pool.totalValueLockedToken1.times(token1.derivedETH))
//   pool.totalValueLockedUSD = pool.totalValueLockedETH.times(bundle.ethPriceUSD)

//   // reset aggregates with new amounts
//   factory.totalValueLockedETH = factory.totalValueLockedETH.plus(pool.totalValueLockedETH)
//   factory.totalValueLockedUSD = factory.totalValueLockedETH.times(bundle.ethPriceUSD)

//   let transaction = loadTransaction(call)
//   let join = new Join(transaction.id.toString() + '#' + pool.txCount.toString())
//   join.transaction = transaction.id
//   join.timestamp = transaction.timestamp
//   join.pool = pool.id
//   join.token0 = pool.token0
//   join.token1 = pool.token1
//   join.sender = call.inputs.sender
//   join.origin = call.transaction.from
//   join.amount0 = amount0
//   join.amount1 = amount1
//   join.amountUSD = amountUSD
//   join.logIndex = call.transaction.index

//   updateGamutDayData(call)
//   updatePoolDayData(call)
//   updatePoolHourData(call)
//   updateTokenDayData(token0 as Token, call)
//   updateTokenDayData(token1 as Token, call)
//   updateTokenHourData(token0 as Token, call)
//   updateTokenHourData(token1 as Token, call)

//   token0.save()
//   token1.save()
//   pool.save()
//   factory.save()
//   join.save()
// }

// export function handleExitPool(call: ExitPoolCall): void {
//   let bundle = Bundle.load('1')
//   let poolAddress = call.from.toHexString()
//   let pool = Pool.load(poolAddress)
//   let factory = Factory.load(FACTORY_ADDRESS)
//   let poolContract = PoolABI.bind(Address.fromString(poolAddress));
//   let weights = poolContract.getWeights();

//   let token0 = Token.load(pool.token0)
//   let token1 = Token.load(pool.token1)
//   let amount0 = convertTokenToDecimal(call.inputValues[2].value.toBigIntArray()[0])
//   let amount1 = convertTokenToDecimal(call.inputValues[2].value.toBigIntArray()[1])

//   let amountUSD = amount0
//     .times(token0.derivedETH.times(bundle.ethPriceUSD))
//     .plus(amount1.times(token1.derivedETH.times(bundle.ethPriceUSD)))

//   // reset tvl aggregates until new amounts calculated
//   factory.totalValueLockedETH = factory.totalValueLockedETH.minus(pool.totalValueLockedETH)

//   // update globals
//   factory.txCount = factory.txCount.plus(ONE_BI)

//   // update pool
//   pool.weight0 = weights[0].toBigDecimal()
//   pool.weight1 = weights[1].toBigDecimal()

//   // update token0 data
//   token0.txCount = token0.txCount.plus(ONE_BI)
//   token0.totalValueLocked = token0.totalValueLocked.minus(amount0)
//   token0.totalValueLockedUSD = token0.totalValueLocked.times(token0.derivedETH.times(bundle.ethPriceUSD))

//   // update token1 data
//   token1.txCount = token1.txCount.plus(ONE_BI)
//   token1.totalValueLocked = token1.totalValueLocked.minus(amount1)
//   token1.totalValueLockedUSD = token1.totalValueLocked.times(token1.derivedETH.times(bundle.ethPriceUSD))

//   // pool data
//   pool.txCount = pool.txCount.plus(ONE_BI)

//   pool.totalValueLockedToken0 = pool.totalValueLockedToken0.minus(amount0)
//   pool.totalValueLockedToken1 = pool.totalValueLockedToken1.minus(amount1)
//   pool.totalValueLockedETH = pool.totalValueLockedToken0
//     .times(token0.derivedETH)
//     .plus(pool.totalValueLockedToken1.times(token1.derivedETH))
//   pool.totalValueLockedUSD = pool.totalValueLockedETH.times(bundle.ethPriceUSD)

//   // reset aggregates with new amounts
//   factory.totalValueLockedETH = factory.totalValueLockedETH.plus(pool.totalValueLockedETH)
//   factory.totalValueLockedUSD = factory.totalValueLockedETH.times(bundle.ethPriceUSD)

//   // burn entity
//   let transaction = loadTransaction(call)
//   let exit = new Exit(transaction.id + '#' + pool.txCount.toString())
//   exit.transaction = transaction.id
//   exit.timestamp = transaction.timestamp
//   exit.pool = pool.id
//   exit.token0 = pool.token0
//   exit.token1 = pool.token1
//   exit.sender = call.inputs.sender
//   exit.origin = call.transaction.from
//   exit.amount0 = amount0
//   exit.amount1 = amount1
//   exit.amountUSD = amountUSD

//   updateGamutDayData(call)
//   updatePoolDayData(call)
//   updatePoolHourData(call)
//   updateTokenDayData(token0 as Token, call)
//   updateTokenDayData(token1 as Token, call)
//   updateTokenHourData(token0 as Token, call)
//   updateTokenHourData(token1 as Token, call)

//   token0.save()
//   token1.save()
//   pool.save()
//   factory.save()
//   exit.save()
// }
