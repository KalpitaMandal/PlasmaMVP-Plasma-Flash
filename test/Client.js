import utils from 'ethereumjs-util'
import chai from 'chai'
import chaiHttp from 'chai-http'
//import assertRevert from './helpers/assertRevert'
import { mineToBlockHeight, waitFor } from './helpers/utils'
import { generateFirstWallets } from './helpers/wallets'

import Transaction from '../src/chain/transaction'
import FixedMerkleTree from '../src/lib/fixed-merkle-tree'
import config from '../src/config'

let RootChain = artifacts.require('./RootChain.sol')

const BN = utils.BN
const rlp = utils.rlp

chai.use(chaiHttp)

const printReceiptEvents = receipt => {
  receipt.logs.forEach(l => {
    console.log(JSON.stringify(l.args))
  })
}

// check end point
const endPoint = `http://localhost:${config.app.port}`
const getDepositTx = (wallet, value) => {
  return new Transaction([
    new Buffer([]), // block number 1
    new Buffer([]), // tx number 1
    new Buffer([]), // previous output number 1 (input 1)
    new Buffer([]), // block number 2
    new Buffer([]), // tx number 2
    new Buffer([]), // previous output number 2 (input 2)

    utils.toBuffer(wallet.getAddressString()), // output address 1
    value.toArrayLike(Buffer, 'be', 32), // value for output 2

    utils.zeros(20), // output address 2
    new Buffer([]), // value for output 2

    new Buffer([]) // fee
  ])
}

const getTransferTx = (from, to, pos, value) => {
  const tx = new Transaction([
    utils.toBuffer(pos[0]), // block number 1
    utils.toBuffer(pos[1]), // tx number 1
    utils.toBuffer(pos[2]), // previous output number 1 (input 1)
    new Buffer([]), // block number 2
    new Buffer([]), // tx number 2
    new Buffer([]), // previous output number 2 (input 2)

    utils.toBuffer(to.getAddressString()), // output address 1
    value.toArrayLike(Buffer, 'be', 32), // value for output 2

    utils.zeros(20), // output address 2
    new Buffer([]), // value for output 2

    new Buffer([]) // fee
  ])
  tx.sign1(from.getPrivateKey())
  return tx
}

const value = new BN(web3.toWei(1, 'ether'))
const requiredamount = new BN(web3.toWei(3, 'ether'))
const mnemonics =
  'clock radar mass judge dismiss just intact mind resemble fringe diary casino'
const wallets = generateFirstWallets(mnemonics, 6)

// client
contract('Root chain - client', async function (accounts) {
  describe('Client', async function () {
    let rootChainContract

    before(async function () {
      // get contract from address
      rootChainContract = RootChain.at(config.chain.rootChainContract)
    })

    it('deposit', async function () {
      // draft deposit tx with 1 ether
      const depositor = wallets[0]
      const depositTx = getDepositTx(depositor, value)
      const depositTxBytes = utils.bufferToHex(depositTx.serializeTx())

      // deposit
      const receipt = await rootChainContract.deposit(depositTxBytes, {
        gas: 200000,
        from: depositor.getAddressString(),
        value: value.toString() // 1 value
      })

      // // draft deposit tx with 1 ether
      // const depositor1 = wallets[1]
      // const depositTx1 = getDepositTx(depositor1, value)
      // const depositTxBytes1 = utils.bufferToHex(depositTx1.serializeTx())

      // // deposit
      // const receipt1 = await rootChainContract.deposit(depositTxBytes1, {
      //   gas: 200000,
      //   from: depositor1.getAddressString(),
      //   value: value.toString() // 1 value
      // })

      // // draft deposit tx with 1 ether
      // const depositor2 = wallets[2]
      // const depositTx2 = getDepositTx(depositor2, value)
      // const depositTxBytes2 = utils.bufferToHex(depositTx2.serializeTx())

      // // deposit
      // const receipt2 = await rootChainContract.deposit(depositTxBytes2, {
      // gas: 200000,
      // from: depositor2.getAddressString(),
      // value: value.toString() // 1 value
      // })

      // // draft deposit tx with 1 ether
      // const depositor3 = wallets[3]
      // const depositTx3 = getDepositTx(depositor3, value)
      // const depositTxBytes3 = utils.bufferToHex(depositTx3.serializeTx())

      // // deposit
      // const receipt3 = await rootChainContract.deposit(depositTxBytes3, {
      // gas: 200000,
      // from: depositor3.getAddressString(),
      // value: value.toString() // 1 value
      // })

      // // draft deposit tx with 1 ether
      // const depositor4 = wallets[4]
      // const depositTx4 = getDepositTx(depositor4, value)
      // const depositTxBytes4 = utils.bufferToHex(depositTx4.serializeTx())

      // // deposit
      // const receipt4 = await rootChainContract.deposit(depositTxBytes4, {
      // gas: 200000,
      // from: depositor4.getAddressString(),
      // value: value.toString() // 1 value
      // })

      // // draft deposit tx with 1 ether
      // const depositor5 = wallets[5]
      // const depositTx5 = getDepositTx(depositor5, value)
      // const depositTxBytes5 = utils.bufferToHex(depositTx5.serializeTx())

      // // deposit
      // const receipt5 = await rootChainContract.deposit(depositTxBytes5, {
      // gas: 200000,
      // from: depositor5.getAddressString(),
      // value: value.toString() // 1 value
      // })

      // console.log(receipt)

      // wait for 5 sec (give time to sync chain. TODO fix it)
      await waitFor(15000)
    })

    it('transfer', async function () {
      // draft deposit tx with 1 ether
      const from = wallets[0] // account 1
      const to = wallets[1] // account 2

      let response = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [from.getAddressString()],
          id: 1
        })
      chai.expect(response).to.be.json
      chai.expect(response).to.have.status(200)
      chai
        .expect(response.body.result.length)
        .to.be.above(0, 'No UTXOs to transfer')
      //console.log("from address", response.body.result)
      let response1 = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [to.getAddressString()],
          id: 1
        })

      //console.log("to address", response1.body.result)

      const { blockNumber, txIndex, outputIndex } = response.body.result[0]
      const transferTx = getTransferTx(
        from,
        to,
        [blockNumber, txIndex, outputIndex], // pos
        value
      )
      const transferTxBytes = utils.bufferToHex(transferTx.serializeTx(true)) // include signature

      // broadcast transfer tx
      response = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_sendTx',
          params: [transferTxBytes],
          id: 1
        })
      chai.expect(response).to.be.json
      chai.expect(response).to.have.status(200)
      chai.expect(response.body.result).to.not.equal('0x')
    })

    it('mine more blocks', async function () {
      await mineToBlockHeight(web3.eth.blockNumber + 7)

      // wait for 10 sec (give time to sync chain. TODO fix it)
      await waitFor(10000)
    })
    it('fast-withdraw', async function () {
      const withdrawer = wallets[1]
      const masterAccount = wallets[0] // account 2

      // fetch utxos
      let response = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [withdrawer.getAddressString()],
          id: 1
        })
      chai.expect(response).to.be.json
      chai.expect(response).to.have.status(200)
      console.log('withdraw account response', response.body.result)
      chai
        .expect(response.body.result.length)
        .to.be.above(0, 'No UTXOs to withdraw')

      const { blockNumber, txIndex, outputIndex } = response.body.result[0]
      const transferTx = getTransferTx(
        withdrawer,
        masterAccount,
        [blockNumber, txIndex, outputIndex], // pos
        value
      )

      const transferTxBytes = utils.bufferToHex(transferTx.serializeTx(true)) // include signature

      // broadcast transfer tx
      response = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_sendTx',
          params: [transferTxBytes],
          id: 1
        })
      chai.expect(response).to.be.json
      chai.expect(response).to.have.status(200)
      chai.expect(response.body.result).to.not.equal('0x')
      console.log('transaction on sidechain sent!', response.body.result)

      // the transfer transaction is sent in the above block of code
      // you can see the output in the authorised-dev terminal
      // however till there is a checkpoint on chain we wont be able to see transfer on sidechain
      // hence the logs below will show that the UTXO is still owned by wallet[1]
      // however we will still transfer the user funds on mainchain and wait for transfer on sidechain to go through

      let masterAccountResponse = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [masterAccount.getAddressString()],
          id: 1
        })
      console.log('master account response', masterAccountResponse.body.result)
      let res = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [withdrawer.getAddressString()],
          id: 1
        })
      chai.expect(res).to.be.json
      chai.expect(res).to.have.status(200)
      console.log('withdraw account response', res.body.result)

      console.log(
        'addressses',
        withdrawer.getAddressString(),
        masterAccount.getAddressString()
      )
      // we transfer money on mainchain now
      var balanceOfUserOnMainchain = await web3.eth.getBalance(
        withdrawer.getAddressString()
      )
      var balanceOfMasterOnMainchain = await web3.eth.getBalance(
        masterAccount.getAddressString()
      )
      console.log(
        'balance before withdraw. User: %s MasterAccount:%s',
        web3.fromWei(balanceOfUserOnMainchain),
        web3.fromWei(balanceOfMasterOnMainchain)
      )
      // doing the transfer
      var result = await web3.eth.sendTransaction({
        from: masterAccount.getAddressString(),
        to: withdrawer.getAddressString(),
        value: value
      })
      console.log('sent money on mainchain txHash: ', result)

      var balanceOfUserOnMainchainAfter = await web3.eth.getBalance(
        withdrawer.getAddressString()
      )
      var balanceOfMasterOnMainchainAfter = await web3.eth.getBalance(
        masterAccount.getAddressString()
      )

      console.log(
        'balance after withdraw. User: %s MasterAccount: %s',
        web3.fromWei(balanceOfUserOnMainchainAfter),
        web3.fromWei(balanceOfMasterOnMainchainAfter)
      )
    })
    // it('withdraw', async function () {
    //   const withdrawer = wallets[1]

    //   // fetch utxos
    //   let response = await chai
    //     .request(endPoint)
    //     .post('/')
    //     .send({
    //       jsonrpc: '2.0',
    //       method: 'plasma_getUTXOs',
    //       params: [withdrawer.getAddressString()],
    //       id: 1
    //     })
    //   chai.expect(response).to.be.json
    //   chai.expect(response).to.have.status(200)
    //   chai
    //     .expect(response.body.result.length)
    //     .to.be.above(0, 'No UTXOs to withdraw')

    //   const { blockNumber, txIndex, outputIndex, tx } = response.body.result[0]
    //   const exitTx = new Transaction(tx)
    //   let merkleProofResponse = await chai
    //     .request(endPoint)
    //     .post('/')
    //     .send({
    //       jsonrpc: '2.0',
    //       method: 'plasma_getMerkleProof',
    //       params: [parseInt(blockNumber), parseInt(txIndex)],
    //       id: 1
    //     })
    //   chai.expect(response).to.be.json
    //   chai.expect(response).to.have.status(200)

    //   const {
    //     proof: merkleProof,
    //     root: childBlockRoot
    //   } = merkleProofResponse.body.result

    //   const sigs = utils.bufferToHex(
    //     Buffer.concat([
    //       exitTx.sig1,
    //       exitTx.sig2,
    //       exitTx.confirmSig(
    //         utils.toBuffer(childBlockRoot),
    //         wallets[0].getPrivateKey() // attested transaction from sender to receiver
    //       )
    //     ])
    //   )

    //   // start exit
    //   const receipt = await rootChainContract.startExit(
    //     parseInt(blockNumber) * 1000000000 +
    //     parseInt(txIndex) * 10000 +
    //     parseInt(outputIndex),
    //     utils.bufferToHex(exitTx.serializeTx(false)), // serialize without signature
    //     merkleProof,
    //     sigs,
    //     {
    //       gas: 500000,
    //       from: withdrawer.getAddressString()
    //     }
    //   )
    //   console.log(receipt)
    // })
    it('challenger pool exit', async function () {
      const withdrawer = wallets[0]
      const depositor1 = wallets[1]
      const depositor2 = wallets[2]
      const depositor3 = wallets[3]
      const ChallengerPool = wallets[4] // same as accounts[1]

      const mycontract = '0x33c93ab8c2d94bacfc743d8632fb31206c466225'
      //const mycontract = config.chain.rootChainContract
      let totalVal
      //
      // deposit
      //
      var response = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [withdrawer.getAddressString()],
          id: 1
        })
      console.log("withdrawer has %s tokens before ", response.body.result.length)

      // do deposit for everyone except withdrawer and challenger 
      for (var i = 1; i < 4; i++) {
        await deposit(wallets[i])
      }

      await waitFor(15000)
      console.log('Deposit done!\n')

      //
      //  faulty exit
      //

      // fetch utxos

      // get balance after deposit 
      for (var i = 0; i < 4; i++) {
        var amount = await getNoOfUTXO(wallets[i])
        console.log("wallet %s has %s", i, amount)
      }

      var response = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getUTXOs',
          params: [withdrawer.getAddressString()],
          id: 1
        })
      console.log("withdrawer has %s tokens after ", response.body.result.length)

      const { blockNumber, txIndex, outputIndex, tx } = response.body.result[0]
      const exitTx = new Transaction(tx)
      let merkleProofResponse = await chai
        .request(endPoint)
        .post('/')
        .send({
          jsonrpc: '2.0',
          method: 'plasma_getMerkleProof',
          params: [parseInt(blockNumber), parseInt(txIndex)],
          id: 1
        })
      chai.expect(response).to.be.json
      chai.expect(response).to.have.status(200)
      console.log("sending proof ", merkleProofResponse.body.result)
      const {
        proof: merkleProof,
        root: childBlockRoot
      } = merkleProofResponse.body.result

      const sigs = utils.bufferToHex(
        Buffer.concat([
          exitTx.sig1,
          exitTx.sig2,
          exitTx.confirmSig(
            utils.toBuffer(childBlockRoot),
            wallets[0].getPrivateKey() // attested transaction from sender to receiver
          )
        ])
      )

      // start exit
      const receipt = await rootChainContract.startExit(
        parseInt(blockNumber) * 1000000000 +
        parseInt(txIndex) * 10000 +
        parseInt(outputIndex),
        utils.bufferToHex(exitTx.serializeTx(false)), // serialize without signature
        merkleProof,
        sigs,
        {
          gas: 500000,
          from: withdrawer.getAddressString()
        }
      )
      console.log('Exit Done!\n')

      //
      // transfer
      //

      let transferTx = new Transaction([
        utils.toBuffer(blockNumber), // block number for first input
        new Buffer([]), // tx number for 1st input
        new Buffer([]), // previous output number 1 (as 1st input)
        new Buffer([]), // block number 2
        new Buffer([]), // tx number 2
        new Buffer([]), // previous output number 2 (as 2nd input)

        utils.toBuffer(withdrawer.getAddressString()), // output address 1
        value.toArrayLike(Buffer, 'be', 32), // value for output 2

        utils.zeros(20), // output address 2
        new Buffer([]), // value for output 2

        new Buffer([]) // fee
      ])

      // not required for client side

      /* // serialize tx bytes
       let transferTxBytes = utils.bufferToHex(transferTx.serializeTx())
       transferTx.sign1(wallets[0].getPrivateKey()) // sign1
       merkleHash = transferTx.merkleHash()
       tree = new FixedMerkleTree(16, [merkleHash])
       proof = utils.bufferToHex(Buffer.concat(tree.getPlasmaProof(merkleHash)))
       console.log('Serializing Done!\n')
       // submit block
       let blknum = (await rootChainContract.currentChildBlock()).toNumber()
       let receiptof1 = await rootChainContract.submitBlock(
         utils.bufferToHex(tree.getRoot()),
         blknum
       )
       console.log('Block submitted!\n')*/

      // submiting proof to rootchain contract
      let submitResponse = await submitProof(ChallengerPool, merkleProof)
      console.log('Notifying other nodes about a faulty exit transaction', submitResponse)

      // // challenger pool available balance
      // // fetch utxos
      // let responsechallenger = await chai
      //   .request(endPoint)
      //   .post('/')
      //   .send({
      //     jsonrpc: '2.0',
      //     method: 'plasma_getUTXOs',
      //     params: [ChallengerPool.getAddressString()],
      //     id: 1
      //   })
      // chai.expect(responsechallenger).to.be.json
      // chai.expect(responsechallenger).to.have.status(200)
      // chai
      //   .expect(responsechallenger.body.result.length)
      //   .to.be.above(0, 'No UTXOs to withdraw')
      // console.log(responsechallenger.body.result)


      // Depositing into the Challenger Pool 


      // const depositbyfirst = await donate(depositor3, value)
      // console.log('Deposit has been received', depositbyfirst)
      // const depositbysecond = await donate(depositor4, value)
      // console.log('Deposit has been received', depositbysecond)
      // const depositbythird = await donate(depositor5, value)
      // console.log('Deposit has been received', depositbythird)
      console.log('Proceeding to Challenge Exit')
      //
      // challenge exit
      //

      // let responsechallenge = await chai
      //   .request(endPoint)
      //   .post('/')
      //   .send({
      //     jsonrpc: '2.0',
      //     method: 'plasma_getUTXOs',
      //     params: [withdrawer.getAddressString()],
      //     id: 1
      //   })
      // chai.expect(responsechallenge).to.be.json
      // chai.expect(responsechallenge).to.have.status(200)
      // chai
      //   .expect(responsechallenge.body.result.length)
      //   .to.be.above(0, 'No UTXOs to withdraw')

      // const { blockNumberC, txIndexC, outputIndexC, txC } = responsechallenge.body.result[0]
      // const exitTxC = new Transaction(txC)
      // console.log('Got Exit Transaction!\n')
      // let merkleProofResponsechallenge = await chai
      //   .request(endPoint)
      //   .post('/')
      //   .send({
      //     jsonrpc: '2.0',
      //     method: 'plasma_getMerkleProof',
      //     params: [parseInt(blockNumberC), parseInt(txIndexC)],
      //     id: 1
      //   })
      // chai.expect(response).to.be.json
      // chai.expect(response).to.have.status(200)
      // // console.log("second proog", merkleProofResponsechallenge.body.result)
      // const {
      //   proof: merkleProofC,
      //   root: childBlockRootC
      // } = merkleProofResponse.body.result

      // const sigsC = utils.bufferToHex(
      //   Buffer.concat([
      //     exitTx.sig1,
      //     exitTx.sig2,
      //     exitTx.confirmSig(
      //       utils.toBuffer(childBlockRootC),
      //       wallets[0].getPrivateKey() // attested transaction from sender to receiver
      //     )
      //   ])
      // )

      // const exitIdC = (parseInt(blockNumberC) - 1) * 1000000000 + 10000 * 0 + 0
      // const receiptC = await rootChain.challengeExit(
      //   parseInt(blockNumberC) * 1000000000 + parseInt(txIndexC) * 10000 + parseInt(outputIndexC),
      //   exitIdC,
      //   utils.bufferToHex(exitTxC.serializeTx(false)),
      //   merkleProofC,
      //   sigsC,
      //   utils.bufferToHex(confirmSig)
      // )



      async function donate(owner, value) {
        // fetch utxos
        let response = await chai
          .request(endPoint)
          .post('/')
          .send({
            jsonrpc: '2.0',
            method: 'plasma_getUTXOs',
            params: [owner.getAddressString()],
            id: 1
          })
        chai.expect(response).to.be.json
        chai.expect(response).to.have.status(200)
        chai
          .expect(response.body.result.length)
          .to.be.above(0, 'No UTXOs to withdraw')
        const { blockNumber, txIndex, outputIndex } = response.body.result[0]
        const donateTx = getTransferTx(
          owner,
          ChallengerPool,
          [blockNumber, txIndex, outputIndex], // pos
          value
        )

        const donateTxBytes = utils.bufferToHex(donateTx.serializeTx(true)) // include signature

        // broadcast transfer tx
        response = await chai
          .request(endPoint)
          .post('/')
          .send({
            jsonrpc: '2.0',
            method: 'plasma_sendTx',
            params: [donateTxBytes],
            id: 1
          })
        chai.expect(response).to.be.json
        chai.expect(response).to.have.status(200)
        chai.expect(response.body.result).to.not.equal('0x')
        console.log('%s has deposited into the Challenger Pool', owner.getAddressString())
        return response.body.result
      }
      async function submitProof(owner, proof) {
        var result = await web3.eth.sendTransaction({
          from: owner.getAddressString(),
          to: owner.getAddressString(),
          data: proof
        })

        return result
      }
      async function deposit(address) {
        var depositTx = getDepositTx(address, value)
        var depositTxBytes = utils.bufferToHex(depositTx.serializeTx())

        // deposit
        await rootChainContract.deposit(depositTxBytes, {
          gas: 200000,
          from: address.getAddressString(),
          value: value.toString() // 1 value
        })
      }
      async function getNoOfUTXO(address) {
        let response = await chai
          .request(endPoint)
          .post('/')
          .send({
            jsonrpc: '2.0',
            method: 'plasma_getUTXOs',
            params: [address.getAddressString()],
            id: 1
          })
        return response.body.result.length
      }
    })
  })
})