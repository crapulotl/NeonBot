const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');

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

function checkValidity(inputCommand) {
    let tempObj = readRecord('commands');

    for (let i = 0; i < 2; i++) {
        try {
            if (tempObj['command'][i] === inputCommand) { return true }
        }
        catch (error) {
            return false
        }
    }

    return false;
}

client.once('ready', () => {
    console.log('Ready!');
});

client.on('messageCreate', message => {
    msg = message.content.split(' ');
    command = msg[0].substring(1);

    if (!msg[0].startsWith('+')){
        return
    }
    
    if (!(checkValidity(command))) {
        message.channel.send(`"${command}" is not a valid command`);
        return
    }

    if (command === 'pay') {
        try {
            calcAmount(msg[2]);

            let recipient = msg[1];
            author = message.author.toString();
            let jsonData = readRecord('record');
            jsonDataOld = readRecord('record');

            if ((jsonData[author]['money'] >= amountPayedn) && (amountPayedn > 0)) {

                jsonData[author]['money'] = parseInt(jsonData[author]['money'] - amountPayedn);
                jsonData[recipient]['money'] = parseInt(jsonData[recipient]['money'] + amountPayedn);

                updateRecord('record', '.json', JSON.stringify(jsonData));

                if (author === recipient){ message.channel.send(`Nice try ${message.author.username}`); }
                else { message.channel.send(`You just payed ${recipient} ${amountPayed}N`); }
                
            }
            else {
                if (amountPayedn > 0) { message.channel.send('You do not have enough Neons') }
                else { message.channel.send('Please transfer a larger amount') }
            }
        }
        catch (error) {
            message.channel.send('Sorry, an error occured');
            console.log(error);
        }
    }

    if (command === 'balance'){
        let jsonData = readRecord('record');
        let author = message.author.toString();

        message.channel.send(`${author}. Your balance is: ${jsonData[author]['money'] / 100} Neons`)
    }
});

client.login(token);
