const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('sqlite::memory:');
const Users = sequelize.define('Users', {
    userId: { type: DataTypes.STRING, unique: true },
    coins: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastDaily: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: false });

const Items = sequelize.define('Items', {
    itemId: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    price: { type: DataTypes.INTEGER }, 
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { timestamps: false });

const Transactions = sequelize.define('Transactions', {
    userId: DataTypes.STRING,
    type: DataTypes.STRING, 
    amount: DataTypes.INTEGER,
}, { timestamps: false });

Users.belongsToMany(Items, { through: 'UserItems' });
Items.belongsToMany(Users, { through: 'UserItems' });

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    await sequelize.sync();
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, user } = interaction;

    if (commandName === 'profile') {
        const targetUser = interaction.options.getUser('user') || user;
        const [userRecord] = await Users.findOrCreate({ where: { userId: targetUser.id } });
        await interaction.reply(`User: ${targetUser.tag}\nCoins: ${userRecord.coins}`);
    } else if (commandName === 'daily') {
        const [userRecord] = await Users.findOrCreate({ where: { userId: user.id } });
        const now = Date.now();
        const lastClaimed = userRecord.lastDaily ? new Date(userRecord.lastDaily).getTime() : 0;
        const cooldown = 24 * 60 * 60 * 1000; 

        if (now - lastClaimed < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastClaimed)) / (60 * 60 * 1000));
            return interaction.reply(`You can claim your daily reward in ${remaining} hour(s).`);
        }

        userRecord.lastDaily = now;
        userRecord.coins += 100;
        await userRecord.save();
        await Transactions.create({ userId: user.id, type: 'earn', amount: 100 });
        await interaction.reply(`You received 100 coins! Total Coins: ${userRecord.coins}`);
    } else if (commandName === 'leaderboard') {
        const topUsers = await Users.findAll({
            order: [['coins', 'DESC']],
            limit: 10,
        });

        const leaderboard = topUsers.map(
            (u, i) => `${i + 1}. <@${u.userId}>: ${u.coins} coins`
        ).join('\n');

        await interaction.reply(`**Leaderboard**:\n${leaderboard}`);
    } else if (commandName === 'inventory') {
        const userRecord = await Users.findOrCreate({ where: { userId: user.id } });
        const userItems = await userRecord[0].getItems();

        if (userItems.length === 0) {
            return interaction.reply("Your inventory is empty.");
        }

        const inventoryMessage = userItems.map(item => `${item.name} - ${item.quantity} (${item.description})`).join('\n');
        await interaction.reply(`**Your Inventory:**\n${inventoryMessage}`);
    } else if (commandName === 'trade') {
        const targetUser = interaction.options.getUser('user');
        const offerCoins = interaction.options.getInteger('coins') || 0;
        const offerItemName = interaction.options.getString('item') || null;

        if (!targetUser) {
            return interaction.reply('You need to specify a user to trade with!');
        }

        const [userRecord] = await Users.findOrCreate({ where: { userId: user.id } });
        const [targetRecord] = await Users.findOrCreate({ where: { userId: targetUser.id } });

        let tradeSummary = `You are offering: `;
        if (offerCoins > 0) {
            tradeSummary += `${offerCoins} coins `;
        }
        if (offerItemName) {
            tradeSummary += `and 1x ${offerItemName}`;
        }
        tradeSummary += `\nDo you want to confirm this trade, ${targetUser.tag}? Type yes.`;

        await interaction.reply(tradeSummary);

        const filter = response => response.user.id === user.id && response.content.toLowerCase() === 'yes';
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', async message => {

            let tradeSuccessful = false;

            if (offerCoins > 0 && userRecord.coins >= offerCoins) {
                userRecord.coins -= offerCoins;
                targetRecord.coins += offerCoins;
                tradeSuccessful = true;
            }

            if (offerItemName) {
                const item = await Items.findOne({ where: { name: offerItemName } });

                if (item && item.quantity > 0) {
                    const userItems = await userRecord.getItems();

                    if (userItems.some(i => i.name === offerItemName && i.quantity > 0)) {

                        item.quantity -= 1;
                        targetRecord.addItem(item);
                        tradeSuccessful = true;
                    } else {
                        return interaction.reply("You don't have enough of that item to trade.");
                    }
                } else {
                    return interaction.reply('Item not found!');
                }
            }

            if (!tradeSuccessful) {
                return interaction.reply('The trade could not be completed.');
            }

            await Transactions.create({
                userId: user.id,
                type: 'spend',
                amount: offerCoins
            });

            if (offerItemName) {
                const item = await Items.findOne({ where: { name: offerItemName } });
                await Transactions.create({
                    userId: user.id,
                    type: 'spend',
                    amount: 1,
                    itemId: item.itemId
                });
            }

            await userRecord.save();
            await targetRecord.save();
            await interaction.reply(`Trade successful! You traded ${offerCoins} coins and ${offerItemName || 'no items'} with ${targetUser.tag}.`);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.reply('Trade confirmation timed out.');
            }
        });
    } else if (commandName === 'store') {
        const storeItems = await Items.findAll();
        if (storeItems.length === 0) {
            return interaction.reply("The store is currently empty.");
        }

        const storeMessage = storeItems.map(item => `${item.name} - ${item.price} coins: ${item.description}`).join('\n');
        await interaction.reply(`**Store:**\n${storeMessage}`);
    } else if (commandName === 'buy') {
        const itemName = interaction.options.getString('item');
        const [userRecord] = await Users.findOrCreate({ where: { userId: user.id } });

        const item = await Items.findOne({ where: { name: itemName } });
        if (!item) {
            return interaction.reply("Item not found in the store.");
        }

        if (userRecord.coins < item.price) {
            return interaction.reply("You do not have enough coins to buy this item.");
        }

        userRecord.coins -= item.price;
        await userRecord.save();
        await Transactions.create({ userId: user.id, type: 'spend', amount: item.price });

        await userRecord.addItem(item);
        await interaction.reply(`You have successfully purchased 1x ${item.name}. You now have ${userRecord.coins} coins left.`);
    }
});

client.on('ready', async () => {
    const commands = [
        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('View your profile stats')
            .addUserOption(option =>
                option.setName('user').setDescription('Target user to view profile')),
        new SlashCommandBuilder()
            .setName('daily')
            .setDescription('Claim your daily coins'),
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('View the leaderboard'),
        new SlashCommandBuilder()
            .setName('inventory')
            .setDescription('View your inventory'),
        new SlashCommandBuilder()
            .setName('trade')
            .setDescription('Trade coins/items with another user')
            .addUserOption(option =>
                option.setName('user').setDescription('User to trade with').setRequired(true))
            .addIntegerOption(option =>
                option.setName('coins').setDescription('Amount of coins to trade'))
            .addStringOption(option =>
                option.setName('item').setDescription('Item to trade')),
        new SlashCommandBuilder()
            .setName('store')
            .setDescription('View the store items'),
        new SlashCommandBuilder()
            .setName('buy')
            .setDescription('Buy an item from the store')
            .addStringOption(option =>
                option.setName('item').setDescription('Item to purchase').setRequired(true)),
    ];

    await client.application.commands.set(commands);
});

client.login('YOUR_TOKEN_SIR');