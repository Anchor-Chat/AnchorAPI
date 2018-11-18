# AnchorAPI [![Build Status](https://travis-ci.org/Anchor-Chat/AnchorAPI.svg?branch=master)](https://travis-ci.org/Anchor-Chat/AnchorAPI)
API for the Anchor chat. You use this to create bots and custom clients / integrations

# W.I.P
Currently this API is in a very early stage and functionality + API may change and break often.

# Installation
`npm i @anchor-chat/anchor-api`

# Browsers
if you want to use this in the browser add this to the end of your `<body>`<br>
`<script src="https://anchor-chat.github.io/AnchorAPI/dist/anchor-api.min.js"></script>`<br>
This includes IPFS and OrbitB

# Docs
Docs can be found here:
https://anchor-chat.github.io/AnchorAPI/

# Getting started
This is how you start:
```js
new AnchorAPIBuilder()
    .setDirectory(".anchor") // Not needed but recommended
    .setLoginAndPassword("login", "password")
    .createAccount() // Or login()
    .then(async (api) => {
        // Magic!
    });
```
Look at the docs for more info