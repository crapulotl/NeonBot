const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');
const { stringify } = require('querystring');

let author = '';
let command = '';
let msg = '';

let amountPayed = 0;
let amountPayedn = 0;

let jsonDataOld = null;

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

function readRecord(fileName, fileExt = '.json') {
    return JSON.parse(fs.readFileSync(fileName + fileExt, 'utf-8'));
}

function updateRecord(fileName, fileExt = '.json', inputJson) {
    fs.writeFileSync(`${fileName}${fileExt}`, inputJson);
    fs.writeFileSync(`./backups/${new Date().getTime()}_${fileName}${fileExt}`, JSON.stringify(jsonDataOld));
}

function calcAmount(inputAmount) {
    for (let i = 0; i < inputAmount.length; i++) {
        if (inputAmount[i] === 'n') {
            let value = parseFloat(inputAmount.substring(0, i));
            value = Math.round(value);

            amountPayedn = value;
            amountPayed = value / 100;

            return value / 100;
        }
        else if (inputAmount[i] === 'N') {
            let value = parseFloat(inputAmount.substring(0, i));
            value = Math.round(value);

            amountPayedn = value * 100;
            amountPayed = value;

            return value
        }
        else {
            amountPayedn = 0;
            amountPayed = 0.0;
        }
    }
}

function transfer(jsonData, author, item, recipient, quantity) {
    if (!(jsonData[author][item] >= 0)) { return false }
    if (!(jsonData[recipient][item] >= 0)) { jsonData[recipient][item] = 0 }

    try {
        if (jsonData[author][item] >= quantity) {

            jsonData[author][item] = parseInt(jsonData[author][item] - quantity);
            jsonData[recipient][item] = parseInt(jsonData[recipient][item] + quantity);

            updateRecord('record', '.json', JSON.stringify(jsonData));
            return true
        }
        else { return false }
    } catch (error) { return false }
}

function checkValidity(inputCommand, fileName) {
    let tempObj = readRecord(fileName);

    for (let i = 0; i < tempObj['length']; i++) {
        try {
            if (tempObj['command'][i] === inputCommand) { return true }
        }
        catch (error) {
            return false
        }
    }
    return false;
}

function checkKeyValidity(inputKey, inputValue) {
    let jsonData = readRecord('record')

    try {
        let temp = jsonData[inputKey][inputValue]
        return true
    } catch (error) {
        jsonData[inputKey] = {};
        updateRecord('record', '.json', JSON.stringify(jsonData))
        return false
    }
}

client.once('ready', () => {
    console.log('Ready!');
});

client.on('messageCreate', message => {
    if (!message.content.startsWith('+')) { return }

    try {
        msg = message.content.split(' ');
        command = msg[0].substring(1);
        jsonDataOld = readRecord('record');

        try {
            if (checkValidity(command, 'recipient_based_commands') && !(msg[1].substring(1, 2) === '@')) {
                message.channel.send(`"${msg[1]}" doesn't exist`);
                return
            }
        } catch (error) {
            message.channel.send('Sorry, something went wrong')
        }


        if (!(checkValidity(command, 'commands')) && !(checkValidity(command, 'recipient_based_commands'))) {
            message.channel.send(`"${command}" is not a valid command`);
            return
        }

        if (command === 'pay') {
            calcAmount(msg[2]);

            let recipient = msg[1];
            author = message.author.toString();

            checkKeyValidity(author, 'money');
            checkKeyValidity(recipient, 'money');
            let jsonData = readRecord('record');

            if (amountPayedn > 0 && transfer(jsonData, author, 'money', recipient, amountPayedn)) {
                if (author === recipient) { message.channel.send(`Nice try ${message.author.username}`); }
                else { message.channel.send(`You just payed ${recipient} ${amountPayed}N`); }

            }
            else {
                if (amountPayedn > 0) { message.channel.send('You do not have enough Neons') }
                else { message.channel.send('Please transfer a larger amount') }
            }
        }

        if (command === 'balance') {
            let jsonData = readRecord('record');
            let author = message.author.toString();
            let item = message.content.split('+balance ')[1];

            try {
                if (item === 'money') {
                    message.channel.send(`${author}. Your balance is: ${jsonData[author]['money'] / 100} Neons`)
                } else {
                    if (!(jsonData[author][item] === undefined)) {
                        message.channel.send(`${author}. You have ${jsonData[author][item]} ${item}`)
                    } else { message.channel.send(`${author}. You have no ${item}`) }
                }
            }
            catch (error) {
                message.channel.send(`${author}. You have no ${item.substring}`);
                console.log(error);
                return
            }
        }

        if (command === 'give') {
            let author = message.author.toString();
            let recipient = msg[1];
            let quantity = msg[2];
            let item = message.content.split(`+give ${recipient} ${quantity} `)[1].substring(0);

            checkKeyValidity(author, item);
            checkKeyValidity(recipient, item);

            let jsonData = readRecord('record');

            try {
                if (quantity > 0 && transfer(jsonData, author, item, recipient, quantity)) {
                    if (author === recipient) { message.channel.send(`Nice try ${message.author.username}`); }
                    else { message.channel.send(`You just gave ${recipient} ${quantity} ${item}`); }

                }
                else {
                    if (quantity > 0) { message.channel.send(`You do not have enough ${item}`) }
                    else { message.channel.send(`You can't send 0 ${item}`) }

                };
            }
            catch (error) {
                message.channel.send(`Sorry ${message.author.username}, something seems to have went wrong`);
            }
        }
    }
    catch (error) {
        console.log(error)
        return
    }
});

client.login(token);
