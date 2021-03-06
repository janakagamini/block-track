const lotion = require('lotion')
const peers = require('./peers.js')
const genesis = require.resolve('./genesis.json');

// For WebApp
const express = require('express')
const client = express()

const dev = process.argv[2] === '--dev' || false

const initialState = {
    items: {},
    users: {}
}

const opts = {
    // logTendermint: true,
    devMode: false,
    lotionPort: 3000,
    p2pPort: 46656,
    tendermintPort: 46657,
    initialState: initialState
}

if (dev) {
    console.log('Running in development mode.')
    opts.devMode = true
} else {
    opts.genesis = genesis
    opts.keys = 'priv_validator.json'
    opts.peers = peers
}

let app = lotion(opts)

app.use((state, tx) => {
    // Validation
    if (typeof tx.item === 'string' && typeof tx.user === 'string') {
        // 1. Get previous owner (can be null)
        const prevOwner = state.items[tx.item]
        // 2. Set the new owner
        state.items[tx.item] = state.items[tx.item] || {};
        state.items[tx.item] = tx.user
        // 3. If prev owner is not null, remove item from from him
        if (typeof prevOwner === 'string') {
            state.users[prevOwner][tx.item] = state.users[prevOwner][tx.item] || {}
            delete state.users[prevOwner][tx.item]
        }
        // 4. Add the item to new user 
        state.users[tx.user] = state.users[tx.user] || {}
        state.users[tx.user][tx.item] = state.users[tx.user][tx.item] || {}
        state.users[tx.user][tx.item] = true

        if (prevOwner !== undefined) {
            console.log(`${tx.item} transferred from ${prevOwner} to ${tx.user}`)
        } else {
            console.log(`${tx.user} took first ownership of ${tx.item}`)
        }

        // Prune state
        clearEmpties(state)
    }
})

app.listen(3000).then(genesis => {
    console.log('BlockTrack is tracking!')
    console.log(`GCI: ${genesis.GCI}`)
    startClient()
})

// https://stackoverflow.com/questions/42736031/remove-empty-objects-from-an-object
function clearEmpties(o) {
    for (var k in o) {
        if (!o[k] || typeof o[k] !== "object") {
            continue // If null or not an object, skip to the next iteration
        }

        // The property is an object
        clearEmpties(o[k]); // <-- Make a recursive call on the nested object
        if (Object.keys(o[k]).length === 0) {
            delete o[k]; // The object had no properties, so delete that property
        }
    }
}

function startClient() {
    client.use(express.static('client'))
    client.listen(3001, () => console.log('Client listening on port 3001!'))
}
