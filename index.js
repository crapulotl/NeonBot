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
    /*let neonSign = inputAmount[inputAmount.length - 1]
    if (!(neonSign === 'n') && !(neonSign === 'N')) { return false}*/

    console.log(inputAmount.length)

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
            value = Math.round(value * 100) / 100;

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
    quantity = parseInt(quantity);

    if (!(jsonData[author][item] >= 0)) { return false }
    if (!(jsonData[recipient][item] >= 0)) { jsonData[recipient][item] = 0 }

    try {
        if (jsonData[author][item] >= quantity) {
            jsonData[author][item] = parseInt(jsonData[author][item]) - quantity;
            jsonData[recipient][item] = parseInt(jsonData[recipient][item]) + quantity;

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
        if (!(jsonData[inputKey][inputValue] >= 0)) {
            jsonData[inputKey][inputValue] = 0;
            updateRecord('record', '.json', JSON.stringify(jsonData))
        }
        return true
    }
    catch (error) {
        jsonData[inputKey] = {};
        jsonData[inputKey][inputValue] = 0;
        updateRecord('record', '.json', JSON.stringify(jsonData))
        return false
    }
}

client.once('ready', () => {
    console.log('Ready!');
});

client.on('messageCreate', message => {
    if (!message.content.startsWith('+')) { return }

    let author = message.author.toString();
    let jsonData = readRecord('record');
    for (let key in jsonData[author]) {
        try {
            if (jsonData[author][key] === 0){
                delete jsonData[author][key]
            }
        } 
        catch (error) {
            console.log(error)
        }
    }
    updateRecord('record', '.json', JSON.stringify(jsonData))

    try {
        msg = message.content.split(' ');
        command = msg[0].substring(1).toLowerCase();
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

        if (command == 'pay') {
            /*if (!(calcAmount(msg[2]))) { 
                message.channel.send('Please add an "n" after the amount, type +help for more info');
                return
            }*/
            calcAmount(msg[2]);

            let recipient = msg[1];
            author = message.author.toString();

            checkKeyValidity(author, 'neons');
            checkKeyValidity(recipient, 'neons');
            let jsonData = readRecord('record');

            if (amountPayedn > 0 && transfer(jsonData, author, 'neons', recipient, amountPayedn)) {
                if (author === recipient) { message.channel.send(`Nice try ${message.author.username}`); }
                else { message.channel.send(`You just payed ${recipient} ${amountPayed}N`); }

            }
            else {
                if (amountPayedn > 0) { message.channel.send('You do not have enough Neons') }
                else { message.channel.send('Please transfer a larger amount') }
            }
        }

        if (command == 'balance') {
            let author = message.author.toString();
            let item = message.content.split('+balance ')[1];

            try {
                item = item.toLowerCase();
            } catch (error) {
                item = null;
            }

            if (item === 'all') {
                let tempData = readRecord('record');

                try {
                    msg = JSON.stringify(tempData[author], null, 1)
                    msg = msg.replace(/"/g, '').replace(/{/g, '').replace(/}/g, '').replace(/,/g, '')
                    message.channel.send(`${author}. Here is your summary:\n \`\`\`\n${msg}\n \`\`\``)

                } catch (error) {
                    message.channel.send(`${author}. Here is your summary:\n\`\`\`\n:c\n\`\`\``)
                }
                return
            }

            if (item === null || item === 'money') { item = 'neons' }

            checkKeyValidity(author, item);
            let jsonData = readRecord('record');

            try {
                if (item === 'neons') {
                    message.channel.send(`${author}. Your balance is: ${jsonData[author]['neons'] / 100} Neons`)
                } else { message.channel.send(`${author}. You have ${jsonData[author][item]} ${item}`) }
            }
            catch (error) {
                message.channel.send(`${author}. You have no ${item}`);
                console.log(error);
                return
            }
        }

        if (command == 'give') {
            let author = message.author.toString();
            let recipient = msg[1];
            let quantity = parseInt(msg[2]);
            let item = message.content.split(`+give ${recipient} ${quantity} `)[1]

            try {
                item = item.toLowerCase();
            } catch (error) {
                return
            }

            if (item === 'neons') {
                message.channel.send('Please use the "pay" command to transfer currency')
                return
            }

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

        if (command === 'add') {
            let author = message.author.toString();
            let quantity = parseInt(msg[1]);
            let item = message.content.split(`+add ${quantity} `)[1].toLowerCase();

            if (item === 'neons') {
                if (!(author === '<@513303465053782022>')) {
                    message.channel.send('You are not authorized to add Neons');
                    return
                }
                else {
                    quantity = quantity * 100;
                }
            }

            checkKeyValidity(author, item);
            let jsonData = readRecord('record');

            jsonData[author][item] = parseInt(jsonData[author][item]) + quantity;
            updateRecord('record', '.json', JSON.stringify(jsonData));
            message.channel.send(`Successfully added ${parseInt(msg[1])} ${item} to your inventory`)
        }

        if (command === 'help') { message.channel.send(fs.readFileSync('help.txt', 'utf-8')) }
    }
    catch (error) {
        console.log(error)
        return
    }
});

client.login(token);
